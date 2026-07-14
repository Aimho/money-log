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
          body: "아직 기록된 항목이 없어요. 이름, 그룹, 금액만 입력해도 바로 장부가 채워집니다.",
          title: "첫 축하금 기록을 남겨 보세요.",
        }
      : {
          actionLabel: "필터 해제",
          body: "선택한 그룹에 해당하는 기록이 없어요. 전체 보기로 돌아가면 다른 내역을 확인할 수 있습니다.",
          title: "이 그룹에는 아직 표시할 기록이 없어요.",
        };

  const action = variant === "all" ? onAdd : onClearFilter;

  return (
    <section className="surface-card px-5 py-10 text-center sm:px-6">
      <p className="text-sm font-medium text-[var(--ink-faint)]">빈 상태</p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{copy.title}</h2>
      <p className="mx-auto mt-3 max-w-[440px] text-sm leading-6 text-[var(--ink-soft)]">{copy.body}</p>
      {action ? (
        <button className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95" onClick={action} type="button">
          {copy.actionLabel}
        </button>
      ) : null}
    </section>
  );
}
