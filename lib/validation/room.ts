import { z } from "zod";
import { minutes } from "@/lib/booking/time";
export const roomSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    description: z.string().max(2000),
    capacity: z.number().int().positive(),
    opening_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closing_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    minimum_booking_minutes: z.number().int().positive(),
    maximum_booking_minutes: z.number().int().positive(),
    booking_interval_minutes: z.number().int().min(5).max(120),
    approval_mode: z.enum(["manual", "automatic"]),
    is_active: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (minutes(r.opening_time) >= minutes(r.closing_time))
      ctx.addIssue({
        code: "custom",
        path: ["closing_time"],
        message: "Closing time must be after opening time",
      });
    if (
      r.minimum_booking_minutes > r.maximum_booking_minutes ||
      r.maximum_booking_minutes > minutes(r.closing_time) - minutes(r.opening_time)
    )
      ctx.addIssue({
        code: "custom",
        path: ["maximum_booking_minutes"],
        message: "Maximum must be within operating hours and at least the minimum",
      });
    if (
      r.minimum_booking_minutes % r.booking_interval_minutes ||
      r.maximum_booking_minutes % r.booking_interval_minutes
    )
      ctx.addIssue({
        code: "custom",
        path: ["booking_interval_minutes"],
        message: "Minimum and maximum must be multiples of the interval",
      });
  });
