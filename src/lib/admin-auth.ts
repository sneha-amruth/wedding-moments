import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const TOKEN_SEED = "wedding-admin-session";

export function generateAdminToken(adminPassword: string): string {
  return createHmac("sha256", adminPassword).update(TOKEN_SEED).digest("hex");
}

export function verifyAdminToken(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const expected = generateAdminToken(adminPassword);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
