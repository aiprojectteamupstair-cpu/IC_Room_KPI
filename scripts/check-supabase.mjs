import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
// Match the production build's environment, including .env.production.local.
nextRequire("@next/env").loadEnvConfig(process.cwd(), false);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function reportError(label, error) {
  console.error(`FAIL ${label}: ${error.code || "network/configuration"}: ${error.message}`);
  if (["PGRST205", "42P01", "PGRST202", "42703"].includes(error.code))
    console.error(
      "Check that both supabase/migrations SQL files were applied to this hosted project in filename order. Do not rerun the initial migration over an existing schema.",
    );
  else if (error.code === "42501")
    console.error(
      "Check the table/function grants and RLS policies in the initial migration, and the Data API's exposed schemas.",
    );
  else if (["PGRST301", "PGRST303"].includes(error.code) || /invalid api key/i.test(error.message))
    console.error(
      "Use the publishable or anon key from the same project as NEXT_PUBLIC_SUPABASE_URL.",
    );
  else if (!error.code)
    console.error("Check network access, the project URL, and whether the Supabase project is paused.");
  process.exitCode = 1;
}

if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.production.local, using the same values as Vercel Production.",
  );
  process.exitCode = 1;
} else {
  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    });
    // Reproduce the failing page query as an anonymous visitor. No records are printed.
    const { data: rooms, error } = await db.from("rooms").select("*").order("created_at").retry(false);
    if (error) {
      reportError("rooms", error);
    } else {
      console.log("PASS anonymous rooms query");
      const room = rooms.find((item) => item.is_active);
      if (!room) {
        console.error(
          "FAIL no active room. For an empty installation, run supabase/seed.sql; otherwise activate the intended room in admin settings.",
        );
        process.exitCode = 1;
      }
      const roomId = room?.id || "00000000-0000-0000-0000-000000000000";
      const date = new Date().toISOString().slice(0, 10);
      for (const [name, args] of [
        ["public_schedule", { p_room_id: roomId, p_from: date, p_to: date }],
        ["busy_slots", { p_room_id: roomId, p_date: date }],
        ["unavailable_ranges", { p_room_id: roomId, p_from: date, p_to: date }],
      ]) {
        const result = await db.rpc(name, args).retry(false);
        if (result.error) reportError(name, result.error);
        else console.log(`PASS ${name}`);
      }
      console.log(
        process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
          ? "Booking service key is configured (not validated by this read-only check)."
          : "Reminder: configure SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in Vercel for booking submissions.",
      );
    }
  } catch {
    console.error(
      "FAIL unable to connect. Check the project URL, network access and Supabase project status.",
    );
    process.exitCode = 1;
  }
}
