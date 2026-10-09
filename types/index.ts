export const statuses = ["pending", "approved", "rejected", "cancelled", "completed"] as const;
export type BookingStatus = (typeof statuses)[number];
export const purposes = [
  "Startup Meeting",
  "Workshop",
  "Technical Training",
  "Community Meeting",
  "Presentation",
  "Interview",
  "Project Discussion",
  "Other",
] as const;
export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  opening_time: string;
  closing_time: string;
  minimum_booking_minutes: number;
  maximum_booking_minutes: number;
  booking_interval_minutes: number;
  approval_mode: "manual" | "automatic";
  is_active: boolean;
}
export interface Booking {
  id: string;
  reference: string;
  room_id: string;
  full_name: string;
  phone: string;
  number_of_people: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  purpose: string;
  notes: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
}
export interface ScheduleEntry {
  room_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: "approved" | "completed" | "blocked";
}
export interface BusySlot {
  start_time: string;
  end_time: string;
}
export interface RoomBlock {
  id: string;
  room_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes: string;
  created_at: string;
}
