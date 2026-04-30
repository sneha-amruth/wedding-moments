"use client";

import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import Button from "@/components/ui/Button";
import type { Guest, WeddingEvent } from "@/types/database";

interface UploadSectionProps {
  guest: Guest;
  selectedEvent: WeddingEvent | null;
  weddingId: string;
  onUploadComplete: () => void;
}

interface FileUploadStatus {
  file: File;
  name: string;
  progress: number; // 0–100
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  error?: string;
  previewUrl?: string;
}

export default function UploadSection({
  guest,
  selectedEvent,
  weddingId,
  onUploadComplete,
}: UploadSectionProps) {
  const [queue, setQueue] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: FileUploadStatus[] = Array.from(files).map((file) => ({
      file,
      name: file.name,
      progress: 0,
      status: "pending" as const,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    // Reset input so the same files can be selected again
    e.target.value = "";
  };

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 4,
        maxWidthOrHeight: 3840,
        useWebWorker: true,
        preserveExif: true,
      });
      return compressed;
    } catch {
      // If compression fails, use original
      return file;
    }
  };

  const uploadFile = async (item: FileUploadStatus, index: number) => {
    if (!selectedEvent) return;

    // Update status to compressing
    setQueue((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "compressing", progress: 10 };
      return copy;
    });

    // Compress if it's an image
    const processedFile = await compressImage(item.file);

    // Update status to uploading
    setQueue((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "uploading", progress: 30 };
      return copy;
    });

    // Build form data
    const formData = new FormData();
    formData.append("file", processedFile, item.name);
    formData.append("weddingId", weddingId);
    formData.append("eventId", selectedEvent.id);
    formData.append("guestId", guest.id);
    formData.append("eventName", selectedEvent.name);
    formData.append("guestName", guest.name);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setQueue((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: "done", progress: 100 };
        return copy;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setQueue((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          status: "error",
          progress: 0,
          error: message,
        };
        return copy;
      });
    }
  };

  const handleUploadAll = async () => {
    if (!selectedEvent) return;
    setIsUploading(true);

    const pendingItems = queue
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) => item.status === "pending" || item.status === "error"
      );

    // Upload sequentially to avoid overwhelming the server
    for (const { item, index } of pendingItems) {
      await uploadFile(item, index);
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => {
      const copy = [...prev];
      // Revoke preview URL
      if (copy[index].previewUrl) {
        URL.revokeObjectURL(copy[index].previewUrl!);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "done"));
  };

  const pendingCount = queue.filter(
    (i) => i.status === "pending" || i.status === "error"
  ).length;
  const doneCount = queue.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-5">
      {/* Selected-event banner — makes the destination obvious so guests
          don't accidentally upload PelliKuthuru photos into Engagement. */}
      {selectedEvent ? (
        <div className="bg-black text-white rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-0.5">
              Uploading to
            </p>
            <p className="text-base font-semibold">{selectedEvent.name}</p>
          </div>
          <p className="text-xs text-white/60">Tap event chip above to change</p>
        </div>
      ) : (
        <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600">
          Please select an event above before uploading.
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => selectedEvent && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer
          ${
            selectedEvent
              ? "border-neutral-300 hover:border-black hover:bg-neutral-50"
              : "border-neutral-200 opacity-50 cursor-not-allowed"
          }`}
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-black">
          Tap to select photos &amp; videos
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Select multiple files from your camera roll
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-black">
              {pendingCount > 0
                ? `${pendingCount} file${pendingCount > 1 ? "s" : ""} ready`
                : `${doneCount} uploaded`}
            </p>
            {doneCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-neutral-400 hover:text-black transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          {/* File list */}
          <div className="space-y-2 max-h-64 overflow-y-auto hide-scrollbar">
            {queue.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-neutral-200"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 2.625c0-.621-.504-1.125-1.125-1.125"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black truncate">{item.name}</p>
                  <div className="mt-1">
                    {item.status === "pending" && (
                      <span className="text-xs text-neutral-400">
                        Ready to upload
                      </span>
                    )}
                    {item.status === "compressing" && (
                      <span className="text-xs text-neutral-600">
                        Compressing...
                      </span>
                    )}
                    {item.status === "uploading" && (
                      <div className="w-full bg-neutral-200 rounded-full h-1.5">
                        <div
                          className="bg-black h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === "done" && (
                      <span className="text-xs text-green-600">Uploaded!</span>
                    )}
                    {item.status === "error" && (
                      <span className="text-xs text-red-500">{item.error}</span>
                    )}
                  </div>
                </div>

                {/* Remove button (only for pending/error) */}
                {(item.status === "pending" || item.status === "error") && (
                  <button
                    onClick={() => removeFromQueue(index)}
                    className="text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {pendingCount > 0 && (
            <Button
              className="w-full"
              onClick={() => setConfirmOpen(true)}
              loading={isUploading}
              disabled={!selectedEvent}
            >
              Upload {pendingCount} file{pendingCount > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {queue.length === 0 && (
        <p className="text-center text-sm text-neutral-400 py-4">
          Select photos and videos from your camera roll to share with Sneha
          &amp; Venkatesh.
        </p>
      )}

      {/* Confirmation modal — last-chance check the right event is picked */}
      {confirmOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-black mb-1">
              Confirm upload
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              You&apos;re about to upload{" "}
              <span className="font-semibold text-black">
                {pendingCount} {pendingCount === 1 ? "file" : "files"}
              </span>{" "}
              to:
            </p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                Event
              </p>
              <p className="text-xl font-bold text-black">
                {selectedEvent.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-full border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  handleUploadAll();
                }}
                className="flex-1 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
