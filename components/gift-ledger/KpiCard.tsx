type KpiCardProps = {
  label: string;
  sublabel: string;
  value: string;
};

export function KpiCard({ label, sublabel, value }: KpiCardProps) {
  return (
    <section className="surface-card px-5 py-4 sm:px-6">
      <p className="text-sm font-medium text-[var(--ink-faint)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{sublabel}</p>
    </section>
  );
}
