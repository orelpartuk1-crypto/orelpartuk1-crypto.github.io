// A shape where the content will be, rather than the word "Loading" — the
// screen stops jumping when the data lands. Shared so every list that loads
// (Home's Recent, Analytics' categories…) waits the same way instead of each
// screen picking its own "Loading…" text or nothing at all.
export default function SkeletonRows({ count = 3 }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}
