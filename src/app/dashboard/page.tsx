"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/ui/LoadingScreen";
import EventSelector from "@/components/dashboard/EventSelector";
import UploadSection from "@/components/dashboard/UploadSection";
import GallerySection from "@/components/dashboard/GallerySection";
import AllPhotosSection from "@/components/dashboard/AllPhotosSection";
import type { WeddingEvent, Upload } from "@/types/database";

type Tab = "upload" | "gallery" | "all";

export default function DashboardPage() {
  const { firebaseUser, guest, loading, logout } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WeddingEvent | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [loadingData, setLoadingData] = useState(true);

  const weddingId = process.env.NEXT_PUBLIC_WEDDING_ID!;

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.replace("/login");
      } else if (!guest) {
        router.replace("/register");
      }
    }
  }, [loading, firebaseUser, guest, router]);

  // Fetch events
  useEffect(() => {
    if (!guest) return;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/events?weddingId=${weddingId}`);
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          setSelectedEvent(data.events[0]);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchEvents();
  }, [guest, weddingId]);

  // Fetch uploads for the guest
  const fetchUploads = useCallback(async () => {
    if (!guest) return;
    try {
      const url = selectedEvent
        ? `/api/uploads?guestId=${guest.id}&eventId=${selectedEvent.id}`
        : `/api/uploads?guestId=${guest.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setUploads(data.uploads || []);
    } catch (err) {
      console.error("Failed to fetch uploads:", err);
    }
  }, [guest, selectedEvent]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  if (loading || loadingData)
    return <LoadingScreen message="Loading your dashboard..." />;
  if (!guest) return null;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-black px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-base text-white">
              Sneha &amp; Venkatesh
            </h1>
            <p className="text-xs text-white/50">Hi, {guest.name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Event Selector */}
      <EventSelector
        events={events}
        selectedEvent={selectedEvent}
        onSelect={setSelectedEvent}
      />

      {/* Tab Bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-[52px] z-20">
        <div className="max-w-lg mx-auto flex">
          {(["upload", "gallery", "all"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative
                ${
                  activeTab === tab
                    ? "text-black"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
            >
              {tab === "upload"
                ? "Upload"
                : tab === "gallery"
                ? `My Photos (${uploads.length})`
                : "All Photos"}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5">
        {activeTab === "upload" ? (
          <UploadSection
            guest={guest}
            selectedEvent={selectedEvent}
            weddingId={weddingId}
            onUploadComplete={fetchUploads}
          />
        ) : activeTab === "gallery" ? (
          <GallerySection uploads={uploads} onDelete={fetchUploads} />
        ) : (
          <AllPhotosSection
            selectedEvent={selectedEvent}
            weddingId={weddingId}
            currentGuestId={guest.id}
          />
        )}
      </main>
    </div>
  );
}
