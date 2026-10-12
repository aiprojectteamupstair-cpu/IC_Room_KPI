export function smtpErrorCode(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,30}$/.test(code) ? code : "SMTP_ERROR";
}
export function smtpErrorMessage(code: string) {
  if (code === "EAUTH")
    return "Gmail rejected the SMTP login (EAUTH). Create a new Google App Password for the sender account, set SMTP_PASSWORD in the active environment, and restart or redeploy. Use the App Password, not the Gmail login password.";
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNREFUSED", "ENOTFOUND", "EDNS"].includes(code))
    return `Cannot connect to Gmail (${code}). Check SMTP_HOST=smtp.gmail.com and SMTP_PORT=465 or 587, and network access.`;
  if (["EENVELOPE", "EMESSAGE", "ERECIPIENT"].includes(code))
    return `The mail server did not accept the email (${code}). Check the customer's email address.`;
  if (code === "ETLS")
    return "SMTP encryption failed. Use port 465 with TLS or port 587 with STARTTLS.";
  return `Email sending failed (${code}). Check SMTP settings using Test Gmail connection in admin settings.`;
}
function clean(value: string | undefined) {
  const trimmed = value?.trim() || "";
  return trimmed.replace(/^(["'])(.*)\1$/, "$2");
}
export function smtpSettings(env: Record<string, string | undefined>) {
  const user = clean(env.SMTP_USER),
    host = clean(env.SMTP_HOST) || "smtp.gmail.com";
  const port = Number(clean(env.SMTP_PORT) || 465);
  let pass = clean(env.SMTP_PASSWORD);
  if (host === "smtp.gmail.com") pass = pass.replace(/\s/g, "");
  if (!user || !pass)
    throw new Error(
      "Set SMTP_USER and SMTP_PASSWORD in the active environment. Gmail requires a Google App Password. Restart or redeploy after changing them.",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user))
    throw new Error("SMTP_USER must be the full sender email address.");
  if (![465, 587].includes(port)) throw new Error("Use SMTP_PORT=465 (TLS) or 587 (STARTTLS).");
  if (
    host === "smtp.gmail.com" &&
    (!/^[a-zA-Z]{16}$/.test(pass) || /YOUR_GOOGLE_APP_PASSWORD/i.test(pass))
  )
    throw new Error(
      "SMTP_PASSWORD must be Google's 16-letter App Password, not the Gmail login password or an example placeholder.",
    );
  return {
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    dnsTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
