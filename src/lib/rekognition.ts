import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
  DeleteFacesCommand,
  ResourceAlreadyExistsException,
  type BoundingBox,
} from "@aws-sdk/client-rekognition";
import sharp from "sharp";

const REGION = process.env.AWS_REGION || "us-east-1";
const COLLECTION_ID =
  process.env.REKOGNITION_COLLECTION_ID || "wedding-moments-faces";
const SIMILARITY_THRESHOLD = 85; // 0-100; higher = stricter, fewer false positives

let client: RekognitionClient | null = null;

function getClient(): RekognitionClient {
  if (client) return client;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials missing — set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    );
  }
  client = new RekognitionClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/**
 * Idempotently create the wedding's face collection.
 */
export async function ensureCollection(): Promise<void> {
  try {
    await getClient().send(
      new CreateCollectionCommand({ CollectionId: COLLECTION_ID })
    );
  } catch (err) {
    if (err instanceof ResourceAlreadyExistsException) return;
    throw err;
  }
}

/**
 * Index a guest's selfie. Returns the FaceId on success, or null if no
 * face was detected.
 */
export async function indexGuestFace(
  imageBytes: Uint8Array,
  guestId: string
): Promise<string | null> {
  await ensureCollection();
  const res = await getClient().send(
    new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: imageBytes },
      ExternalImageId: guestId,
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 1,
      QualityFilter: "AUTO",
    })
  );
  return res.FaceRecords?.[0]?.Face?.FaceId ?? null;
}

/**
 * Remove a previously indexed face (e.g. when a guest re-uploads their selfie).
 */
export async function deleteFace(faceId: string): Promise<void> {
  await getClient().send(
    new DeleteFacesCommand({
      CollectionId: COLLECTION_ID,
      FaceIds: [faceId],
    })
  );
}

export interface FaceMatch {
  guestId: string;
  similarity: number;
}

/**
 * Crop a face from the image with a small margin so Rekognition has
 * context for matching.
 */
async function cropFace(
  imageBytes: Buffer,
  bbox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): Promise<Buffer> {
  const margin = 0.15; // 15% padding around the face
  const bx = Math.max(0, (bbox.Left ?? 0) - (bbox.Width ?? 0) * margin);
  const by = Math.max(0, (bbox.Top ?? 0) - (bbox.Height ?? 0) * margin);
  const bw = Math.min(1 - bx, (bbox.Width ?? 0) * (1 + margin * 2));
  const bh = Math.min(1 - by, (bbox.Height ?? 0) * (1 + margin * 2));

  const left = Math.floor(bx * imageWidth);
  const top = Math.floor(by * imageHeight);
  const width = Math.max(1, Math.floor(bw * imageWidth));
  const height = Math.max(1, Math.floor(bh * imageHeight));

  return sharp(imageBytes).extract({ left, top, width, height }).toBuffer();
}

/**
 * Detect every face in the photo, search the collection for each, and
 * return deduped (guestId, bestSimilarity) tuples for matches above the
 * similarity threshold.
 */
export async function findGuestsInPhoto(
  imageBytes: Buffer
): Promise<FaceMatch[]> {
  await ensureCollection();
  const rek = getClient();

  const detect = await rek.send(
    new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ["DEFAULT"],
    })
  );
  const faces = detect.FaceDetails ?? [];
  if (faces.length === 0) return [];

  const meta = await sharp(imageBytes).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) return [];

  const matches = new Map<string, number>();

  for (const face of faces) {
    if (!face.BoundingBox) continue;
    let crop: Buffer;
    try {
      crop = await cropFace(imageBytes, face.BoundingBox, w, h);
    } catch {
      continue; // skip faces near image edges or invalid crops
    }
    try {
      const search = await rek.send(
        new SearchFacesByImageCommand({
          CollectionId: COLLECTION_ID,
          Image: { Bytes: crop },
          FaceMatchThreshold: SIMILARITY_THRESHOLD,
          MaxFaces: 1,
          QualityFilter: "AUTO",
        })
      );
      const top = search.FaceMatches?.[0];
      const guestId = top?.Face?.ExternalImageId;
      const similarity = top?.Similarity ?? 0;
      if (guestId && similarity >= SIMILARITY_THRESHOLD) {
        const prev = matches.get(guestId) ?? 0;
        if (similarity > prev) matches.set(guestId, similarity);
      }
    } catch {
      // No face found in crop, or no matching face in collection — ignore
    }
  }

  return Array.from(matches, ([guestId, similarity]) => ({
    guestId,
    similarity,
  }));
}

/**
 * Search a single image for a specific guest's face. Used by the
 * post-register scan to retroactively match a guest into existing photos.
 * Returns the best similarity score for that guest, or null if no match.
 */
export async function findGuestInPhoto(
  imageBytes: Buffer,
  guestId: string
): Promise<number | null> {
  const all = await findGuestsInPhoto(imageBytes);
  const m = all.find((x) => x.guestId === guestId);
  return m ? m.similarity : null;
}
