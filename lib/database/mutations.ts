import "server-only";
import { localQuery } from "./local";
import { isLocal } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
type Table = "bookings" | "rooms" | "room_blocks";
type MutationResult = {
  data: { id: string }[] | null;
  error: { code?: string; message: string } | null;
};
export async function mutate(
  table: Table,
  operation: "insert" | "update" | "delete",
  fields: Record<string, unknown>,
  id?: string,
): Promise<MutationResult> {
  if (isLocal()) {
    try {
      const keys = Object.keys(fields);
      if (keys.some((k) => !/^[_a-z]+$/.test(k))) throw new Error("Invalid field");
      const values = keys.map((k) => fields[k]);
      let sql: string;
      if (operation === "insert")
        sql = `insert into public.${table} (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id`;
      else if (operation === "update") {
        values.push(id);
        sql = `update public.${table} set ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} where id=$${values.length} returning id`;
      } else {
        values.push(id);
        sql = `delete from public.${table} where id=$${values.length} returning id`;
      }
      return { data: await localQuery<{ id: string }>(sql, values, "authenticated"), error: null };
    } catch (error) {
      const e = error as { code?: string; message?: string };
      return { data: null, error: { code: e.code, message: e.message || "Could not save" } };
    }
  }
  const db = await supabaseServer();
  const query =
    operation === "insert"
      ? db.from(table).insert(fields)
      : operation === "update"
        ? db.from(table).update(fields).eq("id", id!)
        : db.from(table).delete().eq("id", id!);
  return query.select("id");
}
