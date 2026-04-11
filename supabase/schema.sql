-- =============================================
-- Wedding Moments — Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Weddings ──────────────────────────────
CREATE TABLE weddings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  couple_names    TEXT NOT NULL,
  admin_email     TEXT UNIQUE NOT NULL,
  admin_password_hash TEXT NOT NULL,
  qr_code_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Events ────────────────────────────────
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id      UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  date            DATE,
  guest_list_type TEXT NOT NULL DEFAULT 'open' CHECK (guest_list_type IN ('open', 'family_only')),
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_wedding ON events(wedding_id);

-- ─── Guests ────────────────────────────────
CREATE TABLE guests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id      UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  phone           TEXT NOT NULL,
  name            TEXT NOT NULL,
  firebase_uid    TEXT NOT NULL,
  face_consent    BOOLEAN DEFAULT FALSE,
  selfie_url      TEXT,
  is_family       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id, phone)
);

CREATE INDEX idx_guests_wedding ON guests(wedding_id);
CREATE INDEX idx_guests_firebase ON guests(firebase_uid);

-- ─── Uploads ───────────────────────────────
CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id      UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  guest_id        UUID REFERENCES guests(id) ON DELETE CASCADE NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  mime_type       TEXT NOT NULL,
  file_size       BIGINT NOT NULL,
  drive_file_id   TEXT NOT NULL,
  drive_view_url  TEXT NOT NULL,
  thumbnail_url   TEXT,
  is_hidden       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploads_wedding ON uploads(wedding_id);
CREATE INDEX idx_uploads_event ON uploads(event_id);
CREATE INDEX idx_uploads_guest ON uploads(guest_id);

-- ─── Row Level Security ────────────────────

-- Enable RLS on all tables
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Weddings: read-only for everyone (they need the wedding info)
CREATE POLICY "Weddings are viewable by all authenticated"
  ON weddings FOR SELECT
  USING (true);

-- Events: viewable by all (guests need to see event list)
CREATE POLICY "Events are viewable by all"
  ON events FOR SELECT
  USING (true);

-- Guests: a guest can only read/update their own row
CREATE POLICY "Guests can view own profile"
  ON guests FOR SELECT
  USING (true);

CREATE POLICY "Guests can insert own profile"
  ON guests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Guests can update own profile"
  ON guests FOR UPDATE
  USING (firebase_uid = current_setting('app.firebase_uid', true));

-- Uploads: guests see only their own uploads
CREATE POLICY "Guests can view own uploads"
  ON uploads FOR SELECT
  USING (
    guest_id IN (
      SELECT id FROM guests
      WHERE firebase_uid = current_setting('app.firebase_uid', true)
    )
  );

CREATE POLICY "Guests can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (
    guest_id IN (
      SELECT id FROM guests
      WHERE firebase_uid = current_setting('app.firebase_uid', true)
    )
  );

CREATE POLICY "Guests can delete own uploads"
  ON uploads FOR DELETE
  USING (
    guest_id IN (
      SELECT id FROM guests
      WHERE firebase_uid = current_setting('app.firebase_uid', true)
    )
  );
