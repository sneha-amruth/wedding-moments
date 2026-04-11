"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "@/lib/firebase";
import type { ConfirmationResult } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import LoadingScreen from "@/components/ui/LoadingScreen";

type Step = "phone" | "otp";

export default function LoginPage() {
  const { firebaseUser, guest, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading) {
      if (firebaseUser && guest) {
        router.replace("/dashboard");
      } else if (firebaseUser && !guest) {
        router.replace("/register");
      }
    }
  }, [loading, firebaseUser, guest, router]);

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          /* ignore */
        }
        recaptchaRef.current = null;
      }
    };
  }, []);

  const getRecaptcha = () => {
    if (!auth) return null;

    // Clear any existing instance first
    if (recaptchaRef.current) {
      try {
        recaptchaRef.current.clear();
      } catch {
        /* ignore */
      }
      recaptchaRef.current = null;
    }

    // Clear the container element so Firebase can re-use it
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }

    recaptchaRef.current = new RecaptchaVerifier(
      auth,
      recaptchaContainerRef.current!,
      {
        size: "invisible",
      }
    );

    return recaptchaRef.current;
  };

  const handleSendOTP = async () => {
    setError("");
    if (!auth) {
      setError(
        "Firebase is not configured. Please set up your environment variables."
      );
      return;
    }
    if (phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSending(true);
    try {
      const recaptcha = getRecaptcha();
      if (!recaptcha) {
        setError(
          "Could not initialize verification. Please refresh and try again."
        );
        return;
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptcha);
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err: unknown) {
      console.error("OTP send error:", err);
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setVerifying(true);
    try {
      await confirmationRef.current!.confirm(otp);
      // onAuthStateChanged in AuthContext will pick up the user
      // and the useEffect above will redirect
    } catch (err: unknown) {
      console.error("OTP verify error:", err);
      const message = err instanceof Error ? err.message : "Invalid OTP";
      setError(message);
    } finally {
      setVerifying(false);
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

      {/* Back button */}
      <button
        onClick={() => (step === "otp" ? setStep("phone") : router.push("/"))}
        className="absolute top-6 left-6 z-20 text-white/70 hover:text-white transition-colors"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Couple names header */}
        <p className="font-serif-display text-white/60 text-lg mb-8">
          Sneha &amp; Venkatesh
        </p>

        <Card className="w-full max-w-sm">
          {step === "phone" ? (
            <>
              <h2 className="text-xl font-bold text-black mb-1">
                Enter your phone number
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                We&apos;ll send you a one-time verification code.
              </p>

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={error}
              />

              <Button
                className="w-full mt-5"
                onClick={handleSendOTP}
                loading={sending}
              >
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-black mb-1">
                Verify your number
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-black">{phone}</span>
              </p>

              <Input
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                error={error}
              />

              <Button
                className="w-full mt-5"
                onClick={handleVerifyOTP}
                loading={verifying}
              >
                Verify &amp; Continue
              </Button>

              <button
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                className="w-full mt-3 text-sm text-neutral-500 hover:text-black transition-colors"
              >
                Change phone number
              </button>
            </>
          )}
        </Card>
      </div>

      {/* Invisible recaptcha container */}
      <div ref={recaptchaContainerRef} />
    </main>
  );
}
