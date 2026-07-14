type DesktopEntryPanelProps = {
  children: React.ReactNode;
};

export function DesktopEntryPanel({ children }: DesktopEntryPanelProps) {
  return (
    <aside className="sticky top-[108px]">
      <section className="surface-card px-5 py-5">{children}</section>
    </aside>
  );
}
