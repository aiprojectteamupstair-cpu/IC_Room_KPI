export default function LoadingWorkspace() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-6 py-5">
      <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-10 w-60 rounded-xl bg-zinc-200" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-zinc-200" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}
