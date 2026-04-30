-- Face recognition + featured photos schema additions
-- Run in Supabase SQL editor as a one-shot migration.

-- Per-guest face indexing
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS selfie_face_id TEXT;

-- Per-upload featured flag and face-processing status
ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS face_processed_at TIMESTAMPTZ;

-- Photo ↔ guest matches from face recognition
CREATE TABLE IF NOT EXISTS photo_matches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id   UUID REFERENCES uploads(id) ON DELETE CASCADE NOT NULL,
  guest_id    UUID REFERENCES guests(id) ON DELETE CASCADE NOT NULL,
  similarity  REAL NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(upload_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_matches_guest ON photo_matches(guest_id);
CREATE INDEX IF NOT EXISTS idx_photo_matches_upload ON photo_matches(upload_id);
CREATE INDEX IF NOT EXISTS idx_uploads_featured ON uploads(is_featured) WHERE is_featured = TRUE;
