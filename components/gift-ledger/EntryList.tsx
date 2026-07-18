"use client";

import { useMemo, useState } from "react";

import type { GiftEntry, SortMode } from "@/lib/types";

import { EntryRow } from "@/components/gift-ledger/EntryRow";

type EntryListProps = {
  canDeleteEntry: (entry: GiftEntry) => boolean;
  entries: GiftEntry[];
  hasPendingDeletion: boolean;
  onDelete: (entryId: string) => void;
  onSortChange: (mode: SortMode) => void;
  sortMode: SortMode;
};

const ENTRY_PAGE_SIZE = 50;

export function EntryList({ canDeleteEntry, entries, hasPendingDeletion, onDelete, onSortChange, sortMode }: EntryListProps) {
  const [visibleCount, setVisibleCount] = useState(ENTRY_PAGE_SIZE);
  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);
  const remainingCount = entries.length - visibleEntries.length;

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">기록 <span className="ml-1 font-medium tabular-nums text-[var(--ink-faint)]">{entries.length}</span></h2>
        <div className="inline-flex rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {([
            ["latest", "최신순"],
            ["amount", "금액순"],
          ] as const).map(([value, label]) => {
            const selected = sortMode === value;

            return (
              <button
                className={`min-h-11 rounded-[var(--radius-soft)] px-3 text-sm font-medium transition-colors active:scale-95 ${
                  selected ? "bg-[var(--accent)] text-white" : "text-[var(--ink-soft)]"
                }`}
                key={value}
                onClick={() => onSortChange(value)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

        <ul className="divide-y divide-[rgba(34,33,29,0.08)]">
        {visibleEntries.map((entry) => (
          <EntryRow canDelete={canDeleteEntry(entry)} entry={entry} isDeleteDisabled={hasPendingDeletion} key={entry.id} onDeleteAction={() => onDelete(entry.id)} />
        ))}
      </ul>
      {remainingCount > 0 ? (
        <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <button
            className="min-h-11 w-full rounded-[var(--radius-soft)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--ink-soft)] transition-transform active:scale-95"
            onClick={() => setVisibleCount((current) => current + ENTRY_PAGE_SIZE)}
            type="button"
          >
            기록 더 보기 <span className="ml-1 tabular-nums text-[var(--ink-faint)]">{Math.min(ENTRY_PAGE_SIZE, remainingCount)}개</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
