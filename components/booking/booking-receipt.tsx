"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "./status-badge";
import { displayDate, displayTime } from "@/lib/booking/time";
const receiptSchema = z.object({
  reference: z.string().regex(/^IC-\d{8}-[A-Z0-9]+$/),
  booking_date: z.string().date(),
  start_time: z.string().regex(/^\d{2}:\d{2}/),
  end_time: z.string().regex(/^\d{2}:\d{2}/),
  duration_minutes: z.number().positive(),
  number_of_people: z.number().positive(),
  status: z.enum(["pending", "approved"]),
});
export function BookingReceipt() {
  const [receipt, setReceipt] = useState<z.infer<typeof receiptSchema> | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const parsed = receiptSchema.safeParse(
        JSON.parse(sessionStorage.getItem("ic-booking-receipt") || "null"),
      );
      if (parsed.success) setReceipt(parsed.data);
    } catch {
      /* Missing or invalid local receipt. */
    }
    setLoaded(true);
  }, []);
  if (!loaded)
    return (
      <p role="status" className="py-20 text-center">
        Loading confirmation…
      </p>
    );
  if (!receipt)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">No booking confirmation found</h1>
        <p className="my-4 text-muted-foreground">
          Submit a booking request to receive your reference.
        </p>
        <Button asChild>
          <Link href="/book">Book the room</Link>
        </Button>
      </div>
    );
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="p-7 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Check size={30} />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold">Booking Request Submitted</h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">
          Your booking request has been submitted successfully. The Innovation Centre team will
          review your request.
        </p>
        <div className="my-6 rounded-xl bg-muted p-4 text-center">
          <p className="eyebrow">Booking reference</p>
          <p className="mt-2 text-xl font-bold tracking-wide">{receipt.reference}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Save this reference for your records.
          </p>
        </div>
        <dl className="space-y-4 text-sm">
          {[
            ["Date", displayDate(receipt.booking_date)],
            ["Time", `${displayTime(receipt.start_time)} – ${displayTime(receipt.end_time)}`],
            ["Duration", `${receipt.duration_minutes / 60} hours`],
            ["People", String(receipt.number_of_people)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <BookingStatusBadge status={receipt.status} />
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">
          {receipt.status === "pending"
            ? "Pending Approval · Your time is reserved while your request is reviewed."
            : "Your booking is confirmed."}{" "}
          All times Asia/Yangon.
        </p>
        <Button asChild className="mt-7 w-full">
          <Link href="/schedule">
            View room schedule
            <ArrowRight size={16} />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
