export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-7xl space-y-6 p-8">
      <div className="h-10 w-60 animate-pulse rounded-xl bg-zinc-200" />
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-200" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Loading your space…</p>
    </div>
  );
}
