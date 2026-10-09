"use client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={message}>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          Keep booking
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={pending}>
          {pending ? "Updating…" : "Confirm"}
        </Button>
      </div>
    </Dialog>
  );
}
