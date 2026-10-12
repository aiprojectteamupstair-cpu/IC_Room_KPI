import test from "node:test";
import assert from "node:assert/strict";
import {
  BookingNotificationTracker,
  type BookingNotification,
} from "../lib/admin/notification-feed";
import { smtpSettings, smtpErrorMessage } from "../lib/email/smtp-settings";
const item = (id: string, created_at: string): BookingNotification => ({
  id,
  created_at,
  reference: id,
  full_name: "Test",
  booking_date: "2026-10-20",
  start_time: "09:00",
  status: "pending",
});
test("notification history does not alert; new booking alerts once across realtime and polling", () => {
  const first = item("first", "2026-10-12T09:00:00Z");
  const tracker = new BookingNotificationTracker([first]);
  assert.deepEqual(tracker.ingest([first]), []);
  const next = item("next", "2026-10-12T09:00:01Z");
  assert.deepEqual(tracker.ingest([next, first]), [next]);
  assert.deepEqual(tracker.ingest([next, first]), []);
  assert.deepEqual(tracker.ingest([{ ...next, status: "approved" }, first]), []);
  assert.deepEqual(tracker.ingest([next, first, item("older", "2026-10-11T09:00:00Z")]), []);
});
test("two bookings with the same timestamp each notify, without repeat alerts", () => {
  const tracker = new BookingNotificationTracker([]);
  const a = item("a", "2026-10-12T09:00:00Z"),
    b = item("b", a.created_at);
  assert.deepEqual(tracker.ingest([a]), [a]);
  assert.deepEqual(tracker.ingest([b, a]), [b]);
  assert.deepEqual(tracker.ingest([b, a]), []);
});
test("Gmail settings normalize pasted quotes and App Password spaces with correct TLS", () => {
  const options = smtpSettings({
    SMTP_USER: '"innovation.centre4@gmail.com"',
    SMTP_PASSWORD: '"abcd efgh ijkl mnop"',
  });
  assert.equal(options.auth.pass, "abcdefghijklmnop");
  assert.equal(options.auth.user, "innovation.centre4@gmail.com");
  assert.equal(options.secure, true);
  assert.equal(
    smtpSettings({
      SMTP_USER: "a@example.com",
      SMTP_PASSWORD: "abcdefghijklmnop",
      SMTP_PORT: "587",
    }).secure,
    false,
  );
});
test("missing or invalid Gmail credentials fail before sending and authentication guidance is specific", () => {
  assert.throws(() => smtpSettings({ SMTP_USER: "a@example.com" }), /Google App Password/);
  assert.throws(
    () => smtpSettings({ SMTP_USER: "a@example.com", SMTP_PASSWORD: "YOUR_GOOGLE_APP_PASSWORD" }),
    /16-letter/,
  );
  assert.match(smtpErrorMessage("EAUTH"), /Gmail rejected/);
  assert.match(smtpErrorMessage("EAUTH"), /restart or redeploy/);
});
