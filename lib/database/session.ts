import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
export const SESSION_COOKIE = "ic-local-admin";
const schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  expires: z.number(),
  version: z.number(),
});
function secret() {
  const value = process.env.LOCAL_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Configure a strong LOCAL_SESSION_SECRET.");
  return value;
}
export function signSession(id: string, name: string, version: number) {
  const payload = Buffer.from(
    JSON.stringify({ id, name, version, expires: Date.now() + 8 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return payload + "." + createHmac("sha256", secret()).update(payload).digest("base64url");
}
export function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const parsed = schema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString()));
    return parsed.success && parsed.data.expires > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
}
export async function localSession() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
