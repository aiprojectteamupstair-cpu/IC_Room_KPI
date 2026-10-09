export function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
export function isLocal() {
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
