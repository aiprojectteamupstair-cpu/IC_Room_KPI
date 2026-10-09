import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { localPool } from "./local";
export async function localLogin(email: string, password: string) {
  const client = await localPool().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{
      id: string;
      password_hash: string;
      full_name: string;
      role: string;
      session_version: number;
      locked: boolean;
    }>(
      "select u.id,u.password_hash,u.session_version,p.full_name,p.role,(u.locked_until>now()) as locked from auth.users u join public.profiles p on p.id=u.id where lower(u.email)=lower($1) for update of u",
      [email],
    );
    const user = rows[0];
    const [salt, hash] = (user?.password_hash || "invalid:00").split(":");
    const received = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (
      !user ||
      user.locked ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received) ||
      !["admin", "super_admin"].includes(user.role)
    ) {
      if (user && !user.locked)
        await client.query(
          "update auth.users set failed_attempts=case when last_failed_at<now()-interval '15 minutes' then 1 else failed_attempts+1 end,locked_until=case when (last_failed_at is null or last_failed_at>=now()-interval '15 minutes') and failed_attempts>=4 then now()+interval '15 minutes' else null end,last_failed_at=now() where id=$1",
          [user.id],
        );
      await client.query("commit");
      return null;
    }
    await client.query("update auth.users set failed_attempts=0,locked_until=null where id=$1", [
      user.id,
    ]);
    await client.query("commit");
    return { id: user.id, name: user.full_name, version: user.session_version };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
