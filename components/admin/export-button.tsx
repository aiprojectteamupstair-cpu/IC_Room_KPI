"use client";
import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function ExportButton({ params = {} }: { params?: Record<string, string | undefined> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const query = new URLSearchParams(
            Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
          );
          const response = await fetch(`/admin/export?${query}`);
          if (!response.ok || !response.headers.get("content-type")?.includes("spreadsheetml"))
            throw new Error("Could not export. Please sign in and try again.");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download =
            response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ||
            "Innovation-Centre.xlsx";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast.success("Excel report downloaded");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not export");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={16} className="text-emerald-700" />
      )}
      {busy ? "Preparing…" : "Export Excel"}
    </Button>
  );
}
