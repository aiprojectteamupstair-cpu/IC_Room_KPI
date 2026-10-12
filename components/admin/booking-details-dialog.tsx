"use client";
import { useEffect, useState, useTransition } from "react";
import { formatInTimeZone } from "@/lib/utils/date";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/booking/status-badge";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  changeStatus,
  bookingHistory,
  emailDeliveryStatus,
  retryBookingEmail,
  emailDeliveryError,
  addMissingBookingEmail,
} from "@/app/actions/admin";
import { displayDate, displayTime } from "@/lib/booking/time";
import type { Booking, BookingStatus } from "@/types";
export function BookingDetailsDialog({
  booking,
  onClose,
  onEdit,
}: {
  booking: Booking | null;
  onClose: () => void;
  onEdit?: (b: Booking) => void;
}) {
  const [pending, run] = useTransition();
  const [confirm, setConfirm] = useState<BookingStatus | null>(null);
  const [history, setHistory] = useState<{ id: number; action: string; created_at: string }[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [emailState, setEmailState] = useState<string | null>(null);
  const [emailError, setEmailError] = useState("");
  useEffect(() => {
    let active = true;
    setEmailState(null);
    setEmailError("");
    if (booking && ["approved", "rejected"].includes(booking.status))
      Promise.all([emailDeliveryStatus(booking.id), emailDeliveryError(booking.id)])
        .then(([state, error]) => {
          if (active) {
            setEmailState(state);
            setEmailError(error || "");
          }
        })
        .catch(() => {
          if (active) setEmailError("Could not check email delivery.");
        });
    return () => {
      active = false;
    };
  }, [booking?.id, booking?.status]);
  useEffect(() => {
    let active = true;
    setHistory([]);
    setHistoryError("");
    if (booking && !booking.id.startsWith("demo"))
      bookingHistory(booking.id)
        .then((rows) => {
          if (active) setHistory(rows);
        })
        .catch(() => {
          if (active) setHistoryError("Could not load booking history.");
        });
    return () => {
      active = false;
    };
  }, [booking?.id]);
  function update(status: BookingStatus) {
    if (!booking) return;
    run(async () => {
      const result = await changeStatus(booking.id, status);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(`Booking ${status}`);
        if (result.warning) toast.warning(result.warning, { duration: 8000 });
        setConfirm(null);
        onClose();
      }
    });
  }
  if (!booking) return null;
  return (
    <>
      <Dialog
        open={!!booking}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
        title={booking.reference}
        description="Booking details and history. Personal details are visible to administrators only."
      >
        <div className="mb-5">
          <BookingStatusBadge status={booking.status} />
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Name", booking.full_name],
            ["Phone", booking.phone],
            ["Email", booking.email || "Not recorded (older booking)"],
            ["Date", displayDate(booking.booking_date)],
            ["Time", `${displayTime(booking.start_time)} – ${displayTime(booking.end_time)}`],
            ["Duration", `${booking.duration_minutes / 60} hours`],
            ["People", String(booking.number_of_people)],
            ["Purpose", booking.purpose],
            ["Created", formatInTimeZone(booking.created_at)],
          ].map(([key, val]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{key}</dt>
              <dd className="mt-1 break-words font-medium">{val}</dd>
            </div>
          ))}
        </dl>
        {!booking.email && (
          <form
            className="mt-5 rounded-2xl border border-border p-4"
            action={(form) =>
              run(async () => {
                const result = await addMissingBookingEmail(
                  booking.id,
                  String(form.get("email") || ""),
                );
                if ("error" in result) toast.error(result.error);
                else {
                  toast.success("Customer email saved");
                  if (result.warning) toast.warning(result.warning, { duration: 12000 });
                  onClose();
                }
              })
            }
          >
            <label htmlFor="missing-booking-email">Customer email is missing</label>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Add the customer's email to send this booking's approval or rejection. Existing
              booking times will stay the same.
            </p>
            <input
              id="missing-booking-email"
              name="email"
              type="email"
              placeholder="customer@example.com"
              required
            />
            <Button type="submit" size="sm" disabled={pending} className="mt-3">
              {pending ? "Saving…" : "Save email"}
            </Button>
          </form>
        )}
        {["approved", "rejected"].includes(booking.status) && (
          <div className="mt-5 rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">Customer email</p>
            <p role="status" className="mt-1 text-xs text-muted-foreground">
              {emailError ||
                (emailState === "sent"
                  ? "Accepted by the mail server"
                  : emailState === "processing"
                    ? "Sending email…"
                    : emailState === "failed"
                      ? "Sending failed. Check SMTP settings and retry."
                      : emailState === "pending"
                        ? "Email queued"
                        : "No decision email queued")}
            </p>
            {emailState && emailState !== "sent" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                className="mt-3"
                onClick={() =>
                  run(async () => {
                    const result = await retryBookingEmail(booking.id);
                    if ("error" in result) toast.error(result.error);
                    else if (result.warning) toast.warning(result.warning, { duration: 8000 });
                    else toast.success("Email sent");
                    try {
                      setEmailState(await emailDeliveryStatus(booking.id));
                      setEmailError((await emailDeliveryError(booking.id)) || "");
                    } catch {
                      setEmailError("Could not check email delivery.");
                    }
                  })
                }
              >
                {pending ? "Sending…" : "Retry email"}
              </Button>
            )}
          </div>
        )}
        {booking.notes && (
          <div className="my-5 rounded-xl bg-muted p-4">
            <p className="eyebrow">Notes</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{booking.notes}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {booking.status === "pending" && (
            <>
              <Button size="sm" disabled={pending} onClick={() => update("approved")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirm("rejected")}>
                Reject
              </Button>
            </>
          )}
          {["pending", "approved"].includes(booking.status) && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit?.(booking)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirm("cancelled")}>
                Cancel booking
              </Button>
            </>
          )}
          {booking.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => update("completed")}
            >
              Mark completed
            </Button>
          )}
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">Booking history</h3>
          {historyError ? (
            <p className="text-xs text-red-700">{historyError}</p>
          ) : history.length ? (
            history.map((h) => (
              <p key={h.id} className="mb-2 flex justify-between gap-2 text-xs">
                <span className="capitalize">{h.action}</span>
                <span className="text-muted-foreground">{formatInTimeZone(h.created_at)}</span>
              </p>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              {booking.id.startsWith("demo")
                ? "History is available with live data."
                : "No history entries loaded."}
            </p>
          )}
        </div>
      </Dialog>
      <ConfirmationDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
        title={confirm === "rejected" ? "Reject this request?" : "Cancel this booking?"}
        message="The time slot will become available again. This change is recorded in booking history."
        pending={pending}
        onConfirm={() => confirm && update(confirm)}
      />
    </>
  );
}
