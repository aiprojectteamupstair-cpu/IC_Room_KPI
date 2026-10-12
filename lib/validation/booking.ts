import { z } from "zod";
import { purposes } from "@/types";
import { today } from "@/lib/booking/time";
export const bookingSchema = z.object({
  room_id: z.string().uuid(),
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(254).toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?[0-9][0-9 ()-]{6,19})$/, "Enter a valid Myanmar or international phone number")
    .refine((s) => {
      const n = s.replace(/\D/g, "").length;
      return n >= 7 && n <= 15;
    }, "Phone number must contain 7–15 digits"),
  number_of_people: z.number().int().positive("At least one person is required"),
  booking_date: z
    .string()
    .date()
    .refine((d) => d >= today(), "Choose today or a future date"),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a start time"),
  duration_minutes: z.number().int().positive(),
  purpose: z.enum(purposes),
  notes: z.string().trim().max(1000),
  website: z.string().max(0, "Invalid submission"),
});
export type BookingInput = z.input<typeof bookingSchema>;
