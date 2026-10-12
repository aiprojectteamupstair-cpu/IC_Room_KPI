import test from "node:test";
import assert from "node:assert/strict";
import { bookingSchema } from "../lib/validation/booking";
import { bookingEmail, type BookingEmailJob } from "../lib/email/message";
import { dispatchBookingEmails } from "../lib/email/dispatch";
import { today } from "../lib/booking/time";

const input = {
  room_id: "11111111-1111-4111-8111-111111111111",
  full_name: "Test User",
  email: " User@Example.com ",
  phone: "09987654321",
  number_of_people: 2,
  booking_date: today(),
  start_time: "10:00",
  duration_minutes: 60,
  purpose: "Other",
  notes: "",
  website: "",
};
test("booking email is required, validated and normalized", () => {
  assert.equal(bookingSchema.parse(input).email, "user@example.com");
  for (const email of [undefined, "", "no-address", "user@example.com\r\nBcc: another@example.com"])
    assert.equal(bookingSchema.safeParse({ ...input, email }).success, false);
});

const job: BookingEmailJob = {
  id: "job-1",
  booking_id: "booking-1",
  lease_token: "lease-1",
  recipient: "user@example.com",
  decision: "approved",
  payload: {
    reference: "IC-20261012-000ABC",
    full_name: '<img src=x onerror="alert(1)">',
    room_name: "Innovation Centre",
    room_code: "IC-001",
    booking_date: "2026-10-15",
    start_time: "09:00:00",
    end_time: "10:00:00",
    number_of_people: 2,
  },
};
test("decision emails escape customer content and contain Yangon booking details", () => {
  const approved = bookingEmail(job);
  assert.match(approved.subject, /approved/);
  assert.ok(!approved.html.includes("<img src=x"));
  assert.match(approved.html, /&lt;img/);
  assert.match(approved.text, /9:00 AM – 10:00 AM \(Asia\/Yangon\)/);
  assert.match(approved.text, /IC-001/);
  const rejected = bookingEmail({ ...job, decision: "rejected" });
  assert.match(rejected.subject, /rejected/);
  assert.match(rejected.text, /could not approve/);
  assert.doesNotMatch(rejected.text, /Your booking is confirmed/);
});
test("sent jobs are acknowledged and not sent again", async () => {
  let claimed = false,
    deliveries = 0;
  const acknowledgements: boolean[] = [];
  const store = {
    claim: async () => {
      if (claimed) return [];
      claimed = true;
      return [job];
    },
    finish: async (_job: BookingEmailJob, sent: boolean) => {
      acknowledgements.push(sent);
    },
  };
  assert.deepEqual(
    await dispatchBookingEmails(job.booking_id, store, async () => {
      deliveries++;
    }),
    { sent: 1, failed: 0 },
  );
  await dispatchBookingEmails(job.booking_id, store, async () => {
    deliveries++;
  });
  assert.equal(deliveries, 1);
  assert.deepEqual(acknowledgements, [true]);
});
test("SMTP failure keeps a retryable job without persisting sensitive messages", async () => {
  let failure: string | null = null;
  const result = await dispatchBookingEmails(
    job.booking_id,
    {
      claim: async () => [job],
      finish: async (_job, sent, error) => {
        assert.equal(sent, false);
        failure = error;
      },
    },
    async () => {
      throw Object.assign(new Error("Secret password and customer email"), { code: "EAUTH" });
    },
  );
  assert.deepEqual(result, { sent: 0, failed: 1, lastError: "EAUTH" });
  assert.equal(failure, "EAUTH");
});
test("acknowledgement failure after sending is surfaced, not marked as an SMTP failure", async () => {
  const calls: boolean[] = [];
  await assert.rejects(
    dispatchBookingEmails(
      job.booking_id,
      {
        claim: async () => [job],
        finish: async (_job, sent) => {
          calls.push(sent);
          throw new Error("Database unavailable");
        },
      },
      async () => {},
    ),
    /Database unavailable/,
  );
  assert.deepEqual(calls, [true]);
});
