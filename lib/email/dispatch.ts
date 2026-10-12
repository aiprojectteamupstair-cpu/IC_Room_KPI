import type { BookingEmailJob } from "./message";
import { smtpErrorCode } from "./smtp-settings";

export interface EmailStore {
  claim: (bookingId: string) => Promise<BookingEmailJob[]>;
  finish: (job: BookingEmailJob, sent: boolean, error: string | null) => Promise<void>;
}

// The database lease prevents concurrent admin clicks from sending the same job.
export async function dispatchBookingEmails(
  bookingId: string,
  store: EmailStore,
  send: (job: BookingEmailJob) => Promise<void>,
) {
  let sent = 0,
    failed = 0;
  let lastError: string | undefined;
  for (const job of await store.claim(bookingId)) {
    try {
      await send(job);
    } catch (error) {
      // SMTP messages may contain addresses or credentials; persist only a safe code.
      const safeCode = smtpErrorCode(error);
      lastError = safeCode;
      await store.finish(job, false, safeCode);
      failed++;
      continue;
    }
    await store.finish(job, true, null);
    sent++;
  }
  return { sent, failed, ...(lastError ? { lastError } : {}) };
}
