type KpiCardProps = {
  label: string;
  value: string;
};

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <section className="surface-card flex min-h-[92px] items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6">
      <p className="whitespace-nowrap text-xs font-medium text-[var(--ink-faint)] sm:text-sm">{label}</p>
      <p className="whitespace-nowrap tabular-nums text-xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-2xl">{value}</p>
    </section>
  );
}
