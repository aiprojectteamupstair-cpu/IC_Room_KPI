import test from "node:test";
import assert from "node:assert/strict";
import { configured, isLocal, isDemo, publicSupabaseKey } from "../lib/supabase/config";

const variables = [
  "VERCEL",
  "DATABASE_PROVIDER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DEMO_MODE",
  "NODE_ENV",
];
function withEnvironment(values: Record<string, string>, check: () => void) {
  const saved = new Map(variables.map((key) => [key, process.env[key]]));
  try {
    for (const key of variables) delete process.env[key];
    Object.assign(process.env, values);
    check();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
test("Vercel uses configured Supabase even if local development provider was copied", () => {
  withEnvironment(
    {
      VERCEL: "1",
      DATABASE_PROVIDER: "local",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    () => {
      assert.equal(configured(), true);
      assert.equal(isLocal(), false);
    },
  );
});
test("local development still uses the explicitly selected native PostgreSQL backend", () => {
  withEnvironment(
    {
      DATABASE_PROVIDER: "local",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    () => assert.equal(isLocal(), true),
  );
});
test("modern publishable keys and legacy anon keys are both recognized", () => {
  withEnvironment(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy_anon_test",
    },
    () => {
      assert.equal(configured(), true);
      assert.equal(publicSupabaseKey(), "legacy_anon_test");
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " sb_publishable_test ";
      assert.equal(publicSupabaseKey(), "sb_publishable_test");
    },
  );
});
test("missing production credentials never activate demo data", () => {
  withEnvironment({ VERCEL: "1", NODE_ENV: "production", DEMO_MODE: "true" }, () => {
    assert.equal(configured(), false);
    assert.equal(isDemo(), false);
  });
});
