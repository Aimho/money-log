import { Users } from "lucide-react";

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
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            {isAllView ? "전체 장부" : `${label} 묶음`}
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--ink-faint)]">합계</p>
          <h2 className="mt-1 tabular-nums text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)] sm:text-[2.75rem]">{formatAmountCompact(totalAmount)}</h2>
        </div>

        <div className="flex items-center border-t border-[rgba(34,33,29,0.08)] pt-4 text-sm text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2 tabular-nums">
            <Users className="h-4 w-4 text-[var(--ink-faint)]" />
            {totalPeople}명
          </span>
        </div>
      </div>
    </section>
  );
}
