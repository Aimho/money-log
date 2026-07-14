import type { GiftEntry, SortMode } from "@/lib/types";

import { EntryRow } from "@/components/gift-ledger/EntryRow";

type EntryListProps = {
  entries: GiftEntry[];
  hasPendingDeletion: boolean;
  onDelete: (entryId: string) => void;
  onSortChange: (mode: SortMode) => void;
  sortMode: SortMode;
};

export function EntryList({ entries, hasPendingDeletion, onDelete, onSortChange, sortMode }: EntryListProps) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">기록 내역</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">이름과 금액을 빠르게 훑어볼 수 있도록 최신순과 금액순을 전환할 수 있습니다.</p>
        </div>
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
        {entries.map((entry) => (
          <EntryRow entry={entry} isDeleteDisabled={hasPendingDeletion} key={entry.id} onDeleteAction={() => onDelete(entry.id)} />
        ))}
      </ul>
    </section>
  );
}
