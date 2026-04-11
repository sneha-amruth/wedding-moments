"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import type { Guest } from "@/types/database";

interface AuthState {
  firebaseUser: User | null;
  guest: Guest | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  guest: null,
  loading: true,
  logout: async () => {},
  refreshGuest: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);

  const weddingId = process.env.NEXT_PUBLIC_WEDDING_ID!;

  // Fetch guest profile from Supabase by firebase UID
  const fetchGuest = async (uid: string) => {
    if (!supabase || !weddingId) return null;

    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("firebase_uid", uid)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching guest:", error);
    }
    return data as Guest | null;
  };

  const refreshGuest = async () => {
    if (firebaseUser) {
      const g = await fetchGuest(firebaseUser.uid);
      setGuest(g);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setFirebaseUser(null);
    setGuest(null);
  };

  useEffect(() => {
    // If Firebase isn't configured, stop loading and bail out
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const g = await fetchGuest(user.uid);
        setGuest(g);
      } else {
        setGuest(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, guest, loading, logout, refreshGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
