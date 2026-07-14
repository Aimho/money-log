"use client";

import { motion, useReducedMotion } from "framer-motion";

import { getGroupTone } from "@/lib/group-palette";
import type { GroupSummary } from "@/lib/types";

type GroupFilterProps = {
  groups: GroupSummary[];
  selectedGroup: string | null;
  onSelectAction: (group: string | null) => void;
};

export function GroupFilter({ groups, onSelectAction, selectedGroup }: GroupFilterProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="surface-card px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">그룹 필터</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">차분한 회색 계열 점으로 그룹을 구분하고, 선택 상태만 초록색으로 강조합니다.</p>
        </div>
      </div>

      <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip
          count={groups.reduce((sum, group) => sum + group.count, 0)}
          isSelected={selectedGroup === null}
          label="전체"
          onClick={() => onSelectAction(null)}
          prefersReducedMotion={prefersReducedMotion}
        />
        {groups.map((group) => (
          <FilterChip
            count={group.count}
            dotColor={getGroupTone(group.name)}
            isSelected={selectedGroup === group.name}
            key={group.name}
            label={group.name}
            onClick={() => onSelectAction(group.name)}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    </section>
  );
}

type FilterChipProps = {
  count: number;
  dotColor?: string;
  isSelected: boolean;
  label: string;
  onClick: () => void;
  prefersReducedMotion: boolean | null;
};

function FilterChip({ count, dotColor, isSelected, label, onClick, prefersReducedMotion }: FilterChipProps) {
  return (
    <motion.button
      aria-pressed={isSelected}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-soft)] border px-3 text-sm font-medium active:scale-95 ${
        isSelected
          ? "border-transparent bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)]"
      }`}
      onClick={onClick}
      transition={prefersReducedMotion ? undefined : { duration: 0.16, ease: "easeOut" }}
      type="button"
      whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
    >
      {dotColor ? <span aria-hidden className="h-2.5 w-2.5 rounded-[var(--radius-soft)]" style={{ backgroundColor: dotColor }} /> : null}
      <span>{label}</span>
      <span className={`${isSelected ? "text-white/80" : "text-[var(--ink-faint)]"}`}>{count}</span>
    </motion.button>
  );
}
