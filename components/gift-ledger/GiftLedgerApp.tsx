"use client";

import { useEffect, useMemo, useState } from "react";

import { AddEntrySheet } from "@/components/gift-ledger/AddEntrySheet";
import { DesktopEntryPanel } from "@/components/gift-ledger/DesktopEntryPanel";
import { EmptyState } from "@/components/gift-ledger/EmptyState";
import { EntryForm } from "@/components/gift-ledger/EntryForm";
import { EntryList } from "@/components/gift-ledger/EntryList";
import { EventMetaBanner } from "@/components/gift-ledger/EventMetaBanner";
import { GroupFilter } from "@/components/gift-ledger/GroupFilter";
import { HeroCard } from "@/components/gift-ledger/HeroCard";
import { KpiCard } from "@/components/gift-ledger/KpiCard";
import { LedgerErrorState } from "@/components/gift-ledger/LedgerErrorState";
import { LedgerSkeleton } from "@/components/gift-ledger/LedgerSkeleton";
import { UndoToast } from "@/components/gift-ledger/UndoToast";
import { DEFAULT_SORT_MODE } from "@/lib/constants";
import { formatAmountCompact } from "@/lib/amount";
import { normalizeStoredGroupName } from "@/lib/group";
import { buildGroupSummaries, buildLedgerSummary, filterEntries, sortEntries } from "@/lib/selectors";
import type { EntryInput, EventMeta, SortMode } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

export function GiftLedgerApp() {
  const {
    entries,
    eventMeta,
    isHydrated,
    pendingDeletion,
    selectedGroup,
    storageError,
    addEntry,
    clearStorageError,
    confirmPendingDeletion,
    hydrate,
    requestDeleteEntry,
    setSelectedGroup,
    undoPendingDeletion,
    updateEventMeta,
  } = useGiftLedgerStore();
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!pendingDeletion) {
      return undefined;
    }

    const remaining = Math.max(pendingDeletion.deadline - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      confirmPendingDeletion();
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [confirmPendingDeletion, pendingDeletion]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.id !== pendingDeletion?.entry.id),
    [entries, pendingDeletion?.entry.id],
  );
  const filteredEntries = useMemo(() => filterEntries(visibleEntries, selectedGroup), [selectedGroup, visibleEntries]);
  const sortedEntries = useMemo(() => sortEntries(filteredEntries, sortMode), [filteredEntries, sortMode]);
  const summary = useMemo(() => buildLedgerSummary(visibleEntries, filteredEntries), [filteredEntries, visibleEntries]);
  const groupSummaries = useMemo(() => buildGroupSummaries(visibleEntries), [visibleEntries]);
  const existingGroups = useMemo(
    () =>
      [...new Set(visibleEntries.map((entry) => normalizeStoredGroupName(entry.group)).filter(Boolean))].sort((left, right) =>
        left.localeCompare(right, "ko"),
      ),
    [visibleEntries],
  );
  const shouldShowMobileFab = visibleEntries.length > 0;

  const handleAddEntry = (input: EntryInput) => {
    addEntry(input);
    setIsSheetOpen(false);
  };

  const handleSaveEventMeta = (nextEventMeta: EventMeta) => {
    updateEventMeta(nextEventMeta);
  };

  if (!isHydrated) {
    return <LedgerSkeleton />;
  }

  if (storageError) {
    return <LedgerErrorState message={storageError} onDismiss={clearStorageError} />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 lg:px-8">
          <EventMetaBanner eventMeta={eventMeta} entryCount={visibleEntries.length} onSaveAction={handleSaveEventMeta} selectedGroup={selectedGroup} />
        </div>
      </header>

      <main className={`${shouldShowMobileFab ? "mobile-fab-clearance " : ""}mx-auto max-w-[1180px] px-4 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-8 lg:px-8 lg:pb-10`}>
        <div className="space-y-4 lg:space-y-5">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <HeroCard label={selectedGroup ?? "전체"} totalAmount={summary.totalAmount} totalPeople={summary.totalPeople} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <KpiCard label="평균 금액" value={formatAmountCompact(summary.averageAmount)} sublabel="기록 1건당 평균" />
              <KpiCard label="그룹 수" value={`${summary.groupCount}개`} sublabel={`${summary.filteredCount}건 표시 중`} />
            </div>
          </section>

          <GroupFilter groups={groupSummaries} selectedGroup={selectedGroup} onSelectAction={setSelectedGroup} />

          {visibleEntries.length === 0 ? (
            <EmptyState onAdd={() => setIsSheetOpen(true)} variant="all" />
          ) : sortedEntries.length === 0 ? (
            <EmptyState onClearFilter={() => setSelectedGroup(null)} variant="filtered" />
          ) : (
            <EntryList entries={sortedEntries} hasPendingDeletion={Boolean(pendingDeletion)} onDelete={requestDeleteEntry} onSortChange={setSortMode} sortMode={sortMode} />
          )}
        </div>

        <div className="hidden lg:block">
          <DesktopEntryPanel>
            <EntryForm entries={visibleEntries} existingGroups={existingGroups} onSubmitAction={handleAddEntry} />
          </DesktopEntryPanel>
        </div>
      </main>

      {shouldShowMobileFab ? (
        <button
          className="mobile-fab-offset fixed right-4 z-30 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-panel)] active:scale-95 sm:right-6 lg:hidden"
          onClick={() => setIsSheetOpen(true)}
          type="button"
        >
          기록 추가
        </button>
      ) : null}

      <AddEntrySheet isOpen={isSheetOpen} onCloseAction={() => setIsSheetOpen(false)}>
        <EntryForm entries={visibleEntries} existingGroups={existingGroups} onSubmitAction={handleAddEntry} />
      </AddEntrySheet>

      <UndoToast isHidden={isSheetOpen} pendingDeletion={pendingDeletion} onUndoAction={undoPendingDeletion} />
    </div>
  );
}
