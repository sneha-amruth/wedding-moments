"use client";

import { useState, useEffect, useCallback } from "react";

interface Event {
  id: string;
  name: string;
  sort_order: number;
  uploadCount: number;
  guestCount: number;
}

interface Guest {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface Upload {
  id: string;
  event_id: string;
  guest_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  drive_file_id: string;
  drive_view_url: string;
  thumbnail_url: string;
  created_at: string;
}

function driveImageUrl(fileId: string, size = 1920): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

interface Stats {
  totalGuests: number;
  totalUploads: number;
  totalSize: number;
  guests: Guest[];
  uploads: Upload[];
  events: Event[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [logging, setLogging] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"photos" | "guests">("photos");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (token) setAuthenticated(true);
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    setLogging(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError("Invalid password");
        return;
      }
      const { token } = await res.json();
      sessionStorage.setItem("admin_token", token);
      setAuthenticated(true);
    } catch {
      setLoginError("Login failed");
    } finally {
      setLogging(false);
    }
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchStats();
  }, [authenticated, fetchStats]);

  const handleDelete = async (uploadId: string) => {
    if (!confirm("Delete this upload?")) return;
    try {
      await fetch(`/api/upload/${uploadId}`, { method: "DELETE" });
      fetchStats();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setAuthenticated(false);
    setPassword("");
  };

  // ─── Login screen ───
  if (!authenticated) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full">
          <h1 className="font-serif-display text-2xl text-black text-center mb-1">Admin</h1>
          <p className="text-neutral-500 text-sm text-center mb-6">Sneha &amp; Venkatesh</p>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
            autoFocus
          />

          {loginError && (
            <p className="text-red-500 text-xs mt-2">{loginError}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={logging || !password}
            className="w-full mt-4 bg-black text-white text-sm font-medium py-3 rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {logging ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading || !stats) {
    return (
      <div className="h-dvh bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Filtered uploads ───
  const filteredUploads = selectedEvent === "all"
    ? stats.uploads
    : stats.uploads.filter((u) => u.event_id === selectedEvent);

  const guestMap = new Map(stats.guests.map((g) => [g.id, g]));

  // ─── Dashboard ───
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-black px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-base text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/50">Sneha &amp; Venkatesh</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStats} className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
              Refresh
            </button>
            <button onClick={handleLogout} className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-2xl font-bold text-black">{stats.totalGuests}</p>
            <p className="text-xs text-neutral-500 mt-1">Guests</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-2xl font-bold text-black">{stats.totalUploads}</p>
            <p className="text-xs text-neutral-500 mt-1">Uploads</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-2xl font-bold text-black">{formatBytes(stats.totalSize)}</p>
            <p className="text-xs text-neutral-500 mt-1">Storage</p>
          </div>
        </div>

        {/* Per-event stats */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <h2 className="text-sm font-medium text-black mb-3">Events</h2>
          <div className="space-y-2">
            {stats.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-black">{event.name}</span>
                <div className="flex gap-4 text-xs text-neutral-500">
                  <span>{event.uploadCount} photos</span>
                  <span>{event.guestCount} guests</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <button
            onClick={() => setSelectedEvent("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedEvent === "all" ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            All ({stats.totalUploads})
          </button>
          {stats.events.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelectedEvent(event.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedEvent === event.id ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
            >
              {event.name} ({event.uploadCount})
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-neutral-200 rounded-t-xl flex">
          {(["photos", "guests"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === tab ? "text-black" : "text-neutral-400 hover:text-neutral-600"}`}
            >
              {tab === "photos" ? `Photos (${filteredUploads.length})` : `Guests (${stats.totalGuests})`}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-neutral-200 p-4">
          {activeTab === "photos" ? (
            filteredUploads.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-8">No uploads yet</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {filteredUploads.map((upload) => (
                  <div key={upload.id} className="relative group">
                    <div
                      className="aspect-square rounded-lg overflow-hidden bg-neutral-100 cursor-pointer"
                      onClick={() => setLightboxUrl(driveImageUrl(upload.drive_file_id))}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={driveImageUrl(upload.drive_file_id, 400)}
                        alt={upload.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1 pointer-events-none group-hover:pointer-events-auto">
                      <p className="text-white text-[10px] truncate max-w-full px-2">
                        {guestMap.get(upload.guest_id)?.name || "Unknown"}
                      </p>
                      <p className="text-white/60 text-[10px]">{timeAgo(upload.created_at)}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(upload.id); }}
                        className="mt-1 text-red-400 hover:text-red-300 text-[10px] underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            stats.guests.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-8">No guests registered yet</p>
            ) : (
              <div className="space-y-2">
                {stats.guests.map((guest) => {
                  const guestUploads = stats.uploads.filter((u) => u.guest_id === guest.id);
                  return (
                    <div key={guest.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-black">{guest.name}</p>
                        <p className="text-xs text-neutral-400">{guest.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-black">{guestUploads.length} photos</p>
                        <p className="text-xs text-neutral-400">{timeAgo(guest.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-50"
            onClick={() => setLightboxUrl(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
