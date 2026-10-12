import "server-only";
import type { Booking, Room, RoomBlock } from "@/types";
export const demoRoom: Room = {
  id: "11111111-1111-4111-8111-111111111111",
  room_code: "IC-001",
  name: "Innovation Centre Main Room",
  description: "A space for ambitious ideas. Collaborate, learn and build with your community.",
  capacity: 10,
  opening_time: "09:00",
  closing_time: "17:00",
  minimum_booking_minutes: 60,
  maximum_booking_minutes: 360,
  booking_interval_minutes: 30,
  approval_mode: "manual",
  is_active: true,
};
export function demoBookings(): Booking[] {
  return [];
}
export function demoBlocks(): RoomBlock[] {
  return [];
}
