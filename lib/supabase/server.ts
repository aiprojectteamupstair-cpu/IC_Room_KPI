import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configured, publicSupabaseUrl, publicSupabaseKey } from "./config";
export async function supabaseServer() {
  if (!configured())
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in Vercel's Production environment, then redeploy.",
    );
  const store = await cookies();
  return createServerClient(publicSupabaseUrl()!, publicSupabaseKey()!, {
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
  });
}
