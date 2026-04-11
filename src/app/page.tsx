"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Home() {
  const { firebaseUser, guest, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser && guest) {
        router.replace("/dashboard");
      } else if (firebaseUser && !guest) {
        router.replace("/register");
      }
    }
  }, [loading, firebaseUser, guest, router]);

  if (loading) return <LoadingScreen />;

  return (
    <main className="h-dvh max-h-dvh flex flex-col relative overflow-hidden bg-black">
      {/* Full-bleed background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg_image.jpg"
        alt="Sneha & Venkatesh"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Dark gradient overlay — heavier at bottom for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/80" />

      {/* Content — pinned to the bottom */}
      <div className="relative z-10 mt-auto px-6 pb-[env(safe-area-inset-bottom,24px)] pt-16 text-center">
        {/* Couple names */}
        <p className="text-white/70 text-xs uppercase tracking-[0.3em] mb-3">
          The wedding of
        </p>
        <h1 className="font-serif-display text-5xl text-white leading-tight">
          Sneha &amp; Venkatesh
        </h1>

        {/* Thin divider */}
        <div className="w-16 h-px bg-white/40 mx-auto my-4" />

        <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed">
          Share your photos &amp; discover candid moments of yourself captured
          by other guests.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push("/login")}
          className="mt-6 w-full max-w-xs mx-auto block bg-white text-black font-medium text-sm
            py-3.5 px-8 rounded-full transition-all duration-300
            hover:bg-white/90 active:scale-[0.98]"
        >
          Share Your Moments
        </button>

        <p className="mt-3 text-white/40 text-xs">
          No app download needed &middot; Takes 30 seconds
        </p>
      </div>
    </main>
  );
}
