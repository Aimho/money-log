type DesktopEntryPanelProps = {
  children: React.ReactNode;
};

export function DesktopEntryPanel({ children }: DesktopEntryPanelProps) {
  return (
    <aside className="sticky top-[108px]">
      <section className="surface-card px-5 py-5">
        <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-[var(--ink)]">기록 추가</h2>
        {children}
      </section>
    </aside>
  );
}
