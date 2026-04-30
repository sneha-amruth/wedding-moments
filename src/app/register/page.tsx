"use client";

import { useState, useEffect, useRef } from "react";
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
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfie(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (faceConsent && !selfie) {
      setError("Please add a selfie so we can find photos of you.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("weddingId", weddingId);
      fd.append("phone", firebaseUser!.phoneNumber || "");
      fd.append("name", name.trim());
      fd.append("firebaseUid", firebaseUser!.uid);
      fd.append("faceConsent", String(faceConsent));
      if (selfie) fd.append("selfie", selfie);

      const res = await fetch("/api/guest/register", {
        method: "POST",
        body: fd,
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg_image.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center blur-sm scale-105"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
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

            {/* Face consent + selfie */}
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-3">
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
                    Add a selfie so we can show you photos others took of you.
                  </p>
                </div>
              </label>

              {faceConsent && (
                <div className="flex items-center gap-3 pt-2 border-t border-neutral-200">
                  {selfiePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selfiePreview}
                      alt="Your selfie"
                      className="w-16 h-16 rounded-full object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                        />
                      </svg>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 text-sm font-medium text-black underline underline-offset-2 hover:opacity-70 text-left"
                  >
                    {selfie ? "Retake selfie" : "Take a selfie"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieChange}
                    className="hidden"
                  />
                </div>
              )}
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
