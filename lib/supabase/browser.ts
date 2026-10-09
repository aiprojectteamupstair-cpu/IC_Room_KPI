"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseUrl, publicSupabaseKey } from "./config";
export function supabaseBrowser() {
  return createBrowserClient(publicSupabaseUrl()!, publicSupabaseKey()!);
}
