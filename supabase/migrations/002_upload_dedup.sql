-- Add content hash for deduplication of identical uploads.
ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- A guest uploading the same file twice should be skipped at insert time.
CREATE INDEX IF NOT EXISTS idx_uploads_dedup
  ON uploads(guest_id, content_hash)
  WHERE content_hash IS NOT NULL;
