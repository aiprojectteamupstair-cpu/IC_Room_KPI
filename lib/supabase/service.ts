import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseUrl } from "./config";
export function bookingService() {
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret || !publicSupabaseUrl()) throw new Error("Booking service is not configured.");
  return createClient(publicSupabaseUrl()!, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
