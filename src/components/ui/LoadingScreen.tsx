"use client";

export default function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="relative w-10 h-10 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200" />
        <div className="absolute inset-0 rounded-full border-2 border-black border-t-transparent animate-spin" />
      </div>
      <p className="text-neutral-500 text-sm">{message}</p>
    </div>
  );
}
