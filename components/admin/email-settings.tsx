"use client";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { testEmailConnection } from "@/app/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function EmailSettings() {
  const [pending, run] = useTransition();
  const [result, setResult] = useState<{ success: true } | { error: string } | null>(null);
  return (
    <Card className="mx-auto mt-6 max-w-3xl">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Mail size={20} />
            Booking emails
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Test Gmail connection and authentication without sending an email. Configure SMTP_USER and
          SMTP_PASSWORD in the active host environment.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              setResult(null);
              try {
                setResult(await testEmailConnection());
              } catch {
                setResult({
                  error: "Could not run the connection test. Refresh and sign in again.",
                });
              }
            })
          }
        >
          {pending ? "Testing Gmail…" : "Test Gmail connection"}
        </Button>
        {result && (
          <p
            role="status"
            className={`mt-4 rounded-xl p-4 text-sm leading-6 ${"error" in result ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
          >
            {"error" in result
              ? result.error
              : "SMTP connection and login succeeded. Open the booking and retry its email. No test email was sent."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
