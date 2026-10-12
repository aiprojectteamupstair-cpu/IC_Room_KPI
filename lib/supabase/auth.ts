import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "./server";
import { isDemo, isLocal } from "./config";
import { localSession } from "@/lib/database/session";
import { localPool } from "@/lib/database/local";
export async function requireAdmin() {
  if (isLocal()) {
    const session = await localSession();
    if (!session) redirect("/admin/login");
    const { rows } = await localPool().query<{
      full_name: string;
      role: string;
      session_version: number;
    }>(
      "select p.full_name,p.role,u.session_version from public.profiles p join auth.users u on u.id=p.id where p.id=$1",
      [session.id],
    );
    if (
      !rows[0] ||
      !["admin", "super_admin"].includes(rows[0].role) ||
      rows[0].session_version !== session.version
    )
      redirect("/admin/login");
    return { id: session.id, name: rows[0].full_name, demo: false };
  }
  if (isDemo()) redirect("/admin/login");
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/admin/login");
  const { data: profile } = await db
    .from("profiles")
    .select("full_name,role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role))
    redirect("/admin/login?error=unauthorized");
  return { id: user.id, name: profile.full_name as string, demo: false };
}
