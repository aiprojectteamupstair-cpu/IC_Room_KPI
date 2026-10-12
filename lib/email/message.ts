import { displayDate, displayTime } from "../booking/time";

export interface BookingEmailJob {
  id: string;
  booking_id: string;
  lease_token: string;
  recipient: string;
  decision: "approved" | "rejected";
  payload: {
    reference: string;
    full_name: string;
    room_name: string;
    room_code: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    number_of_people: number;
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function bookingEmail(job: BookingEmailJob) {
  const b = job.payload;
  const approved = job.decision === "approved";
  const heading = approved ? "Your booking is confirmed" : "An update on your booking";
  const explanation = approved
    ? "The Innovation Centre team has approved your request. We look forward to welcoming you."
    : "The Innovation Centre team could not approve this request. Please contact us or choose another available time.";
  const details = [
    ["Reference", b.reference],
    ["Room", `${b.room_name} · ${b.room_code}`],
    ["Date", displayDate(b.booking_date)],
    ["Time", `${displayTime(b.start_time)} – ${displayTime(b.end_time)} (Asia/Yangon)`],
    ["People", String(b.number_of_people)],
    ["Status", approved ? "Approved" : "Rejected"],
  ];
  return {
    subject: `Booking ${job.decision} · ${b.reference}`,
    text: `${heading}\n\nHello ${b.full_name},\n\n${explanation}\n\n${details.map(([key, value]) => `${key}: ${value}`).join("\n")}\n\nContact: innovation.centre4@gmail.com\nViber: 09880768700\n\nInnovation Centre`,
    html: `<div style="font-family:Arial,sans-serif;color:#253043;max-width:560px;margin:auto;padding:32px;border:1px solid #e9ecf1;border-radius:20px"><p style="color:#c8463c;font-weight:bold">INNOVATION CENTRE</p><h1 style="font-size:26px">${heading}</h1><p>Hello ${escapeHtml(b.full_name)},</p><p style="line-height:1.7">${explanation}</p><table style="width:100%;border-collapse:collapse">${details.map(([key, value]) => `<tr><td style="padding:12px 8px;border-bottom:1px solid #e9ecf1;color:#687386">${key}</td><td style="padding:12px 8px;border-bottom:1px solid #e9ecf1">${escapeHtml(value)}</td></tr>`).join("")}</table><p style="font-size:13px;line-height:1.8">Questions? Email innovation.centre4@gmail.com<br>Viber: 09880768700</p></div>`,
  };
}
