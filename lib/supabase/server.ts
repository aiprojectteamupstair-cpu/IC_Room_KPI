import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configured } from "./config";
export async function supabaseServer() {
  if (!configured())
    throw new Error(
      "Supabase is not configured. Set the environment variables to connect your centre.",
    );
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            /* Server Components are read-only; proxy refreshes cookies. */
          }
        },
      },
    },
  );
}
