"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Upload } from "@/types/database";

interface GallerySectionProps {
  uploads: Upload[];
  onDelete: () => void;
}

function driveImageUrl(fileId: string, size = 1920): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export default function GallerySection({
  uploads,
  onDelete,
}: GallerySectionProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const viewingUpload = viewingIndex !== null ? uploads[viewingIndex] : null;
  const [deleting, setDeleting] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const showPrev = useCallback(() => {
    setViewingIndex((i) => (i === null ? null : (i - 1 + uploads.length) % uploads.length));
  }, [uploads.length]);

  const showNext = useCallback(() => {
    setViewingIndex((i) => (i === null ? null : (i + 1) % uploads.length));
  }, [uploads.length]);

  useEffect(() => {
    if (viewingIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
      else if (e.key === "Escape") setViewingIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewingIndex, showPrev, showNext]);

  const handleDelete = async (uploadId: string) => {
    if (!confirm("Delete this photo? This cannot be undone.")) return;

    setDeleting(uploadId);
    try {
      const res = await fetch(`/api/upload/${uploadId}`, { method: "DELETE" });
      if (res.ok) {
        setViewingIndex(null);
        onDelete();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-black">No photos yet</p>
        <p className="text-xs text-neutral-400 mt-1">
          Upload your first photos from the Upload tab!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {uploads.map((upload, idx) => (
          <button
            key={upload.id}
            onClick={() => setViewingIndex(idx)}
            className="aspect-square rounded-lg overflow-hidden bg-neutral-100 relative group"
          >
            {upload.file_type === "video" ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <svg
                  className="w-8 h-8 text-white/80"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
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
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox / Full View */}
      {viewingUpload && viewingIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) < 50) return;
            if (dx < 0) showNext();
            else showPrev();
          }}
        >
          {/* Lightbox header */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setViewingIndex(null)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <span className="text-xs text-white/60">
              {viewingIndex + 1} / {uploads.length}
            </span>

            <div className="flex items-center gap-3">
              {/* Download */}
              <a
                href={viewingUpload.drive_view_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </a>
              {/* Delete */}
              <button
                onClick={() => handleDelete(viewingUpload.id)}
                disabled={deleting === viewingUpload.id}
                className="text-white/80 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Image/Video with prev/next overlay */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {uploads.length > 1 && (
              <button
                onClick={showPrev}
                aria-label="Previous"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

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

            {uploads.length > 1 && (
              <button
                onClick={showNext}
                aria-label="Next"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* File info */}
          <div className="p-4 text-center">
            <p className="text-xs text-white/60">{viewingUpload.file_name}</p>
          </div>
        </div>
      )}
    </>
  );
}
