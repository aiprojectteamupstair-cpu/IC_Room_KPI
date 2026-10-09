export function publicSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}
export function publicSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
export function configured() {
  return Boolean(publicSupabaseUrl() && publicSupabaseKey());
}
export function isLocal() {
  // A local development setting must not override a configured hosted backend.
  if (process.env.VERCEL === "1" && configured()) return false;
  return process.env.DATABASE_PROVIDER === "local";
}
export function isDemo() {
  return (
    !isLocal() &&
    !configured() &&
    process.env.DEMO_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
