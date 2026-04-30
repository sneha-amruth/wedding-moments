// ─── Weddings ────────────────────────────────────────────
export interface Wedding {
  id: string;
  name: string;
  couple_names: string;
  admin_email: string;
  admin_password_hash: string;
  qr_code_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingInsert {
  id?: string;
  name: string;
  couple_names: string;
  admin_email: string;
  admin_password_hash: string;
  qr_code_url?: string | null;
}

export interface WeddingUpdate {
  name?: string;
  couple_names?: string;
  qr_code_url?: string | null;
  updated_at?: string;
}

// ─── Events ──────────────────────────────────────────────
export interface WeddingEvent {
  id: string;
  wedding_id: string;
  name: string;
  date: string | null;
  guest_list_type: "open" | "family_only";
  sort_order: number;
  created_at: string;
}

export interface WeddingEventInsert {
  id?: string;
  wedding_id: string;
  name: string;
  date?: string | null;
  guest_list_type?: "open" | "family_only";
  sort_order?: number;
}

export interface WeddingEventUpdate {
  name?: string;
  date?: string | null;
  guest_list_type?: "open" | "family_only";
  sort_order?: number;
}

// ─── Guests ──────────────────────────────────────────────
export interface Guest {
  id: string;
  wedding_id: string;
  phone: string;
  name: string;
  firebase_uid: string;
  face_consent: boolean;
  selfie_url: string | null;
  is_family: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestInsert {
  id?: string;
  wedding_id: string;
  phone: string;
  name: string;
  firebase_uid: string;
  face_consent?: boolean;
  selfie_url?: string | null;
  is_family?: boolean;
}

export interface GuestUpdate {
  name?: string;
  face_consent?: boolean;
  selfie_url?: string | null;
  is_family?: boolean;
  updated_at?: string;
}

// ─── Uploads ─────────────────────────────────────────────
export interface Upload {
  id: string;
  wedding_id: string;
  event_id: string;
  guest_id: string;
  file_name: string;
  file_type: "photo" | "video";
  mime_type: string;
  file_size: number;
  drive_file_id: string;
  drive_view_url: string;
  thumbnail_url: string | null;
  is_hidden: boolean;
  is_featured?: boolean;
  face_processed_at?: string | null;
  created_at: string;
  events?: { name: string } | null;
  guests?: { name: string } | null;
}

export interface UploadInsert {
  id?: string;
  wedding_id: string;
  event_id: string;
  guest_id: string;
  file_name: string;
  file_type: "photo" | "video";
  mime_type: string;
  file_size: number;
  drive_file_id: string;
  drive_view_url: string;
  thumbnail_url?: string | null;
  is_hidden?: boolean;
}

export interface UploadUpdate {
  is_hidden?: boolean;
}
