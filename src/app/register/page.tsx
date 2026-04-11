"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function RegisterPage() {
  const { firebaseUser, guest, loading, refreshGuest } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [faceConsent, setFaceConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const weddingId = process.env.NEXT_PUBLIC_WEDDING_ID!;

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.replace("/login");
      } else if (guest) {
        router.replace("/dashboard");
      }
    }
  }, [loading, firebaseUser, guest, router]);

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          phone: firebaseUser!.phoneNumber,
          name: name.trim(),
          firebaseUid: firebaseUser!.uid,
          faceConsent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      await refreshGuest();
      router.push("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-black">
      {/* Background image — blurred */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg_image.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center blur-sm scale-105"
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Couple names header */}
        <p className="font-serif-display text-white/60 text-lg mb-8">
          Sneha &amp; Venkatesh
        </p>

        <Card className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
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
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-black">Welcome!</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Tell us a bit about yourself.
            </p>
          </div>

          <div className="space-y-5">
            <Input
              label="Your Name"
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
              autoFocus
            />

            {/* Face recognition consent */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={faceConsent}
                  onChange={(e) => setFaceConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-neutral-300 text-black focus:ring-black"
                />
                <div>
                  <p className="text-sm font-medium text-black">
                    Find photos of me
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Allow face recognition to discover photos of you taken by
                    other guests. You can opt out anytime.
                  </p>
                </div>
              </label>
            </div>

            <Button
              className="w-full"
              onClick={handleRegister}
              loading={submitting}
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
