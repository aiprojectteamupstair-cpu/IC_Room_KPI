"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { configured, isDemo, isLocal } from "@/lib/supabase/config";
import { localLogin } from "@/lib/database/login";
import { SESSION_COOKIE, signSession } from "@/lib/database/session";
import { cookies } from "next/headers";
export async function login(form: FormData): Promise<{ error: string } | undefined> {
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1).max(256) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter your email and password." };
  if (isLocal()) {
    const user = await localLogin(parsed.data.email, parsed.data.password);
    if (!user)
      return {
        error:
          "Incorrect email or password, or this account is temporarily locked. Please try again.",
      };
    (await cookies()).set(SESSION_COOKIE, signSession(user.id, user.name, user.version), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    redirect("/admin");
  }
  if (!configured()) return { error: "Connect Supabase to enable administrator login." };
  const db = await supabaseServer();
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Incorrect email or password. Please try again." };
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    await db.auth.signOut();
    return { error: "This account does not have administrator access." };
  }
  redirect("/admin");
}
export async function logout() {
  if (isLocal()) {
    (await cookies()).delete(SESSION_COOKIE);
    redirect("/admin/login");
  }
  if (!isDemo() && configured()) {
    const db = await supabaseServer();
    await db.auth.signOut();
  }
  redirect("/admin/login");
}
