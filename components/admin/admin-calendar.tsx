"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, LockKeyhole } from "lucide-react";
import { BookingCalendar, type CalendarEvent } from "@/components/calendar/booking-calendar";
import { BookingDetailsDialog } from "./booking-details-dialog";
import { BookingEditor } from "./booking-editor";
import { RoomBlockDialog } from "./room-block-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteBlock } from "@/app/actions/admin";
import type { Booking, Room, RoomBlock } from "@/types";
import { displayDate, displayTime } from "@/lib/booking/time";
export function AdminCalendar({
  room,
  rooms,
  bookings,
  blocks,
  date,
}: {
  room: Room;
  rooms: Room[];
  bookings: Booking[];
  blocks: RoomBlock[];
  date: string;
}) {
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | undefined>();
  const [editor, setEditor] = useState(false);
  const [block, setBlock] = useState(false);
  const [slot, setSlot] = useState<{ date: string; start: string } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<RoomBlock | null>(null);
  const [pending, run] = useTransition();
  const events: CalendarEvent[] = [
    ...bookings.filter(
      (b) => b.room_id === room.id && ["approved", "pending", "completed"].includes(b.status),
    ),
    ...blocks
      .filter((b) => b.room_id === room.id)
      .map((b) => ({
        id: b.id,
        booking_date: b.block_date,
        start_time: b.start_time,
        end_time: b.end_time,
        purpose: b.reason,
        status: "blocked" as const,
      })),
  ];
  return (
    <>
      <BookingCalendar
        room={room}
        events={events}
        date={date}
        admin
        onEvent={(e) => {
          if (e.status === "blocked") setSelectedBlock(blocks.find((b) => b.id === e.id) || null);
          else setSelected(bookings.find((b) => b.id === e.id) || null);
        }}
        onSlot={(date, start) => setSlot({ date, start })}
      />
      <BookingDetailsDialog
        booking={selected}
        onClose={() => setSelected(null)}
        onEdit={(b) => {
          setSelected(null);
          setEditing(b);
          setEditor(true);
        }}
      />
      {editor && (
        <BookingEditor
          key={editing?.id || `${slot?.date}-${slot?.start}`}
          open={editor}
          onOpenChange={setEditor}
          rooms={[room, ...rooms.filter((r) => r.id !== room.id)]}
          booking={editing}
          date={slot?.date}
          start={slot?.start}
        />
      )}
      <RoomBlockDialog
        key={`block-${slot?.date}-${slot?.start}`}
        open={block}
        onOpenChange={setBlock}
        room={room}
        date={slot?.date}
        start={slot?.start}
      />
      <Dialog
        open={!!slot && !editor && !block}
        onOpenChange={(v) => {
          if (!v) setSlot(null);
        }}
        title="Reserve this time"
        description={
          slot ? `${displayDate(slot.date)} · ${displayTime(slot.start)}` : "Choose an action"
        }
      >
        <div className="grid gap-3">
          <Button
            onClick={() => {
              setEditing(undefined);
              setEditor(true);
            }}
          >
            <Plus size={16} />
            Create confirmed booking
          </Button>
          <Button variant="outline" onClick={() => setBlock(true)}>
            <LockKeyhole size={16} />
            Block room time
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!selectedBlock}
        onOpenChange={(v) => {
          if (!v) setSelectedBlock(null);
        }}
        title={selectedBlock?.reason || "Blocked time"}
        description={
          selectedBlock
            ? `${displayDate(selectedBlock.block_date)} · ${displayTime(selectedBlock.start_time)} – ${displayTime(selectedBlock.end_time)}`
            : undefined
        }
      >
        <p className="mb-5 whitespace-pre-wrap text-sm text-muted-foreground">
          {selectedBlock?.notes || "No additional notes."}
        </p>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (selectedBlock)
              run(async () => {
                const result = await deleteBlock(selectedBlock.id);
                if ("error" in result) toast.error(result.error);
                else {
                  toast.success("Block removed");
                  setSelectedBlock(null);
                }
              });
          }}
        >
          Remove block
        </Button>
      </Dialog>
    </>
  );
}
