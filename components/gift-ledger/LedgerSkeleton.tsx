function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-md bg-[var(--surface-muted)] motion-reduce:animate-none ${className}`}
    />
  );
}

function EntryRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <li className="flex min-h-[76px] items-center gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBlock className={compact ? "h-4 w-16" : "h-4 w-24"} />
          <SkeletonBlock className="h-5 w-14 rounded-full" />
        </div>
        <SkeletonBlock className={compact ? "h-3 w-24" : "h-3 w-36"} />
      </div>
      <SkeletonBlock className="h-5 w-16" />
      <SkeletonBlock className="size-10 rounded-[var(--radius-soft)]" />
    </li>
  );
}

export function LedgerSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="장부 불러오는 중"
      className="min-h-screen bg-[var(--background)] text-[var(--ink)]"
      role="status"
    >
      <span className="sr-only">장부 불러오는 중</span>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-5 w-36 sm:w-44" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-11 w-32 rounded-[var(--radius-soft)]" />
              <SkeletonBlock className="h-4 w-8" />
              <SkeletonBlock className="h-11 w-20 rounded-[var(--radius-soft)]" />
            </div>
          </div>
          <div className="mt-2 flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border)] pt-2">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="size-3.5 rounded-full" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-14" />
              <SkeletonBlock className="h-8 w-16" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-8 lg:px-8 lg:pb-10">
        <div className="space-y-4 lg:space-y-5">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <div className="surface-card min-h-[190px] px-4 py-5 sm:px-5">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="size-2 rounded-full" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
              <div className="mt-7 space-y-3">
                <SkeletonBlock className="h-3 w-10" />
                <SkeletonBlock className="h-10 w-40 sm:w-52" />
              </div>
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <SkeletonBlock className="h-4 w-16" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
              {["w-20", "w-14"].map((width) => (
                <div className="surface-card flex min-h-[92px] items-center justify-between gap-3 px-4 py-4" key={width}>
                  <SkeletonBlock className="h-3 w-12" />
                  <SkeletonBlock className={`h-7 ${width}`} />
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card px-4 py-4 sm:px-5">
            <SkeletonBlock className="h-3 w-10" />
            <div className="mt-3 flex gap-2 overflow-hidden">
              <SkeletonBlock className="h-10 w-20 shrink-0 rounded-[var(--radius-soft)]" />
              <SkeletonBlock className="h-10 w-24 shrink-0 rounded-[var(--radius-soft)]" />
              <SkeletonBlock className="h-10 w-20 shrink-0 rounded-[var(--radius-soft)]" />
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-11 w-36 rounded-[var(--radius-soft)]" />
            </div>
            <ul className="divide-y divide-[rgba(34,33,29,0.08)]">
              <EntryRowSkeleton />
              <EntryRowSkeleton compact />
              <EntryRowSkeleton />
            </ul>
          </section>
        </div>

        <aside className="hidden lg:block">
          <section className="surface-card sticky top-[120px] p-5">
            <div className="mb-5 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="size-8 rounded-full" />
            </div>
            <div className="space-y-4">
              {["w-10", "w-20", "w-10"].map((width, index) => (
                <div className="space-y-2" key={`${width}-${index}`}>
                  <SkeletonBlock className={`h-3 ${width}`} />
                  <SkeletonBlock className="h-11 w-full rounded-[var(--radius-soft)]" />
                </div>
              ))}
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-8" />
                <SkeletonBlock className="h-20 w-full rounded-[var(--radius-soft)]" />
              </div>
              <SkeletonBlock className="h-11 w-full rounded-[var(--radius-soft)]" />
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
