"use client";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-sm" />
        <Primitive.Content className="dialog-sheet">
          <Primitive.Title className="pr-8 text-xl font-bold">{title}</Primitive.Title>
          <Primitive.Description className="mt-1 text-sm text-muted-foreground">
            {description || "Manage the room reservation."}
          </Primitive.Description>
          <Primitive.Close
            aria-label="Close dialog"
            className="absolute right-3 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-muted hover:bg-slate-200 sm:top-3"
          >
            <X size={18} />
          </Primitive.Close>
          <div className="mt-6">{children}</div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
