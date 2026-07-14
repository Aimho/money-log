import { ReceiptText, Users } from "lucide-react";

import { formatAmountCompact } from "@/lib/amount";

type HeroCardProps = {
  label: string;
  totalAmount: number;
  totalPeople: number;
};

export function HeroCard({ label, totalAmount, totalPeople }: HeroCardProps) {
  const isAllView = label === "전체";

  return (
    <section className="surface-card paper-rule relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
      <div className="absolute inset-y-0 left-0 w-px bg-[rgba(34,33,29,0.08)]" />
      <div className="absolute left-5 right-5 top-[4.9rem] h-px bg-[rgba(34,33,29,0.08)] sm:left-6 sm:right-6" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-soft)] border border-[rgba(34,33,29,0.08)] bg-[rgba(255,255,255,0.62)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {isAllView ? "전체 장부" : `${label} 묶음`}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--ink-faint)]">{isAllView ? "전체 합계" : `${label} 보기`}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-[2.25rem]">{formatAmountCompact(totalAmount)}</h2>
            </div>
          </div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-soft)]">
            <ReceiptText className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-3 text-sm text-[var(--ink-soft)] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] px-3">
            <Users className="h-4 w-4 text-[var(--ink-faint)]" />
            {totalPeople}명 기록
          </span>
          <div className="rounded-[var(--radius-soft)] border border-[rgba(34,33,29,0.08)] bg-[rgba(255,255,255,0.5)] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">집계 메모</p>
            <p className="mt-1 leading-6">{isAllView ? "저장된 전체 항목을 한 장부 흐름으로 바로 합산해 보여줍니다." : `${label} 그룹만 남겨 비교하기 쉬운 집중 보기로 정리했습니다.`}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
