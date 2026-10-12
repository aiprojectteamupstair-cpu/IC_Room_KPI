import { createRequire } from "node:module";
import nodemailer from "nodemailer";
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), false);
const missing = ["SMTP_USER", "SMTP_PASSWORD"].filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(
    `Missing ${missing.join(", ")}. Set the Gmail address and a Google App Password in .env.production.local or Vercel.`,
  );
  process.exitCode = 1;
} else {
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASSWORD.replace(/\s/g, ""),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    await transport.verify();
    console.log("PASS SMTP connection and authentication. No email was sent.");
  } catch (error) {
    console.error(
      `FAIL SMTP verification: ${error.code || "SMTP_ERROR"}. Check the App Password, 2-Step Verification and SMTP host/port.`,
    );
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}
