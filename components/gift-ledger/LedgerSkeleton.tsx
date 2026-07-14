export function LedgerSkeleton() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="surface-card h-[92px] animate-pulse bg-[var(--surface-muted)]" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
              <div className="surface-card h-[220px] animate-pulse bg-[var(--surface-muted)]" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="surface-card h-[102px] animate-pulse bg-[var(--surface-muted)]" />
                <div className="surface-card h-[102px] animate-pulse bg-[var(--surface-muted)]" />
              </div>
            </div>
            <div className="surface-card h-[92px] animate-pulse bg-[var(--surface-muted)]" />
            <div className="surface-card h-[420px] animate-pulse bg-[var(--surface-muted)]" />
          </div>
          <div className="hidden lg:block">
            <div className="surface-card h-[520px] animate-pulse bg-[var(--surface-muted)]" />
          </div>
        </div>
      </div>
    </main>
  );
}
