"use client";

import { useState, useEffect, useCallback } from "react";
import type { WeddingEvent } from "@/types/database";

interface AllUpload {
  id: string;
  file_name: string;
  file_type: string;
  drive_file_id: string;
  drive_view_url: string;
  thumbnail_url: string;
  created_at: string;
  guest_id: string;
  guests: { name: string } | null;
}

function driveImageUrl(fileId: string, size = 1920): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

interface AllPhotosSectionProps {
  selectedEvent: WeddingEvent | null;
  weddingId: string;
  currentGuestId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AllPhotosSection({ selectedEvent, weddingId, currentGuestId }: AllPhotosSectionProps) {
  const [uploads, setUploads] = useState<AllUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUpload, setViewingUpload] = useState<AllUpload | null>(null);

  const fetchAllUploads = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedEvent
        ? `/api/uploads?eventId=${selectedEvent.id}&all=true`
        : `/api/uploads?weddingId=${weddingId}&all=true`;
      const res = await fetch(url);
      const data = await res.json();
      setUploads(data.uploads || []);
    } catch (err) {
      console.error("Failed to fetch all uploads:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedEvent, weddingId]);

  useEffect(() => {
    fetchAllUploads();
  }, [fetchAllUploads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-black">No photos from guests yet</p>
        <p className="text-xs text-neutral-400 mt-1">Be the first to share a moment!</p>
      </div>
    );
  }

  return (
    <>
      {/* Photo count */}
      <p className="text-xs text-neutral-400 mb-3">
        {uploads.length} photo{uploads.length !== 1 ? "s" : ""} from all guests
      </p>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {uploads.map((upload) => {
          const isOwnPhoto = upload.guest_id === currentGuestId;
          const guestName = upload.guests?.name || "Guest";

          return (
            <button
              key={upload.id}
              onClick={() => setViewingUpload(upload)}
              className="aspect-square rounded-lg overflow-hidden bg-neutral-100 relative group"
            >
              {upload.file_type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driveImageUrl(upload.drive_file_id, 400)}
                  alt={upload.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Guest name badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                <p className="text-[10px] text-white truncate">
                  {isOwnPhoto ? "You" : guestName}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {viewingUpload && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setViewingUpload(null)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <a
              href={viewingUpload.drive_view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>

          {/* Image/Video */}
          <div className="flex-1 flex items-center justify-center p-4">
            {viewingUpload.file_type === "video" ? (
              <iframe
                src={drivePreviewUrl(viewingUpload.drive_file_id)}
                className="w-full h-full max-w-4xl rounded-lg"
                allow="autoplay"
                allowFullScreen
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={driveImageUrl(viewingUpload.drive_file_id)}
                alt={viewingUpload.file_name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>

          {/* Info */}
          <div className="p-4 text-center">
            <p className="text-sm text-white/80">
              {viewingUpload.guest_id === currentGuestId ? "Uploaded by you" : `Shared by ${viewingUpload.guests?.name || "a guest"}`}
            </p>
            <p className="text-xs text-white/40 mt-1">{timeAgo(viewingUpload.created_at)}</p>
          </div>
        </div>
      )}
    </>
  );
}
