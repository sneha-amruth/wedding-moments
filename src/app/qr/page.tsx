"use client";

export default function QRPage() {
  const SITE_URL = "https://svmoments.vercel.app";

  const handleDownload = async () => {
    try {
      const res = await fetch(
        `/api/qrcode?url=${encodeURIComponent(SITE_URL)}`
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sneha-venkatesh-wedding-qr.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      {/* Printable card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-sm">
        {/* Header */}
        <p className="text-neutral-400 text-xs uppercase tracking-[0.3em] mb-2">
          The wedding of
        </p>
        <h1 className="font-serif-display text-3xl text-black leading-tight">
          Sneha &amp; Venkatesh
        </h1>

        <div className="w-12 h-px bg-neutral-300 mx-auto my-5" />

        {/* QR Code */}
        <div className="mx-auto w-48 h-48 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qrcode?url=${encodeURIComponent(SITE_URL)}`}
            alt="QR Code"
            className="w-full h-full"
          />
        </div>

        {/* Instructions */}
        <p className="text-black text-sm font-medium mb-1">
          Share Your Moments
        </p>
        <p className="text-neutral-500 text-xs leading-relaxed max-w-[240px] mx-auto">
          Scan this QR code to upload your photos and discover candid moments
          from the celebration.
        </p>

        <div className="w-12 h-px bg-neutral-300 mx-auto my-5" />

        <p className="text-neutral-400 text-[10px] tracking-wider uppercase">
          {SITE_URL.replace("https://", "")}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={handleDownload}
          className="bg-black text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-800 transition-colors"
        >
          Download QR
        </button>
        <button
          onClick={() => window.print()}
          className="bg-white text-black text-sm font-medium px-6 py-3 rounded-full border border-neutral-300 hover:bg-neutral-50 transition-colors"
        >
          Print Card
        </button>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-6 text-xs text-neutral-400 hover:text-black transition-colors"
      >
        &larr; Back to home
      </a>
    </div>
  );
}
