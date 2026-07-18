type EmptyStateProps = {
  onAdd?: () => void;
  onClearFilter?: () => void;
  variant: "all" | "filtered";
};

export function EmptyState({ onAdd, onClearFilter, variant }: EmptyStateProps) {
  const copy =
    variant === "all"
      ? {
          actionLabel: "첫 기록 추가",
          title: "아직 기록이 없습니다",
        }
      : {
          actionLabel: "필터 해제",
          title: "이 그룹에는 기록이 없습니다",
        };

  const action = variant === "all" ? onAdd : onClearFilter;

  return (
    <section className="surface-card px-5 py-9 text-center sm:px-6">
      <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{copy.title}</h2>
      {action ? (
        <button className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95" onClick={action} type="button">
          {copy.actionLabel}
        </button>
      ) : null}
    </section>
  );
}
