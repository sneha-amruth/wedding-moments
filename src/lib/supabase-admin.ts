import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Server-side Supabase client (bypasses RLS — admin only)
// Lazy-init: only used in API routes at runtime, not during build
export const supabaseAdmin = supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (null as unknown as ReturnType<typeof createClient>);
