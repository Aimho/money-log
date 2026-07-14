"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Trash2 } from "lucide-react";

import { formatAmountCompact } from "@/lib/amount";
import { formatRelativeTime } from "@/lib/format";
import { getGroupDisplayName } from "@/lib/group";
import { getGroupTone } from "@/lib/group-palette";
import type { GiftEntry } from "@/lib/types";

type EntryRowProps = {
  entry: GiftEntry;
  isDeleteDisabled: boolean;
  onDeleteAction: () => void;
};

export function EntryRow({ entry, isDeleteDisabled, onDeleteAction }: EntryRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const groupLabel = getGroupDisplayName(entry.group);

  return (
    <motion.li
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      className="px-4 py-4 sm:px-5"
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.18, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold tracking-[-0.02em] text-[var(--ink)]">{entry.name}</p>
            <span className="inline-flex min-h-7 items-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 text-xs font-medium text-[var(--ink-soft)]">
              <span aria-hidden className="h-2 w-2 rounded-[var(--radius-soft)]" style={{ backgroundColor: getGroupTone(groupLabel) }} />
              {groupLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{entry.memo || "메모 없음"}</p>
          <p className="mt-2 text-xs text-[var(--ink-faint)]">{formatRelativeTime(entry.createdAt)}</p>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{formatAmountCompact(entry.amount)}</p>
          </div>
          <button
            aria-label={`${entry.name} 기록 삭제`}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] active:scale-95 ${
              isDeleteDisabled ? "cursor-not-allowed text-[var(--ink-faint)] opacity-55" : "text-[var(--ink-soft)]"
            }`}
            disabled={isDeleteDisabled}
            onClick={onDeleteAction}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
