"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-8 py-24 text-center">
      <h1 className="text-2xl font-bold">We couldn&apos;t load this page</h1>
      <p className="my-5 text-muted-foreground">
        The service may be temporarily unavailable. Please try again in a moment.
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="mb-5 text-sm text-muted-foreground">
          For local PostgreSQL, run <code>npm run db:local:start</code>. For first-time setup, run{" "}
          <code>npm run db:local:setup</code>. If using Supabase, check your configuration and
          migrations. Check the development terminal for the underlying error.
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
