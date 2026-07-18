"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

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
import { canDeleteCloudEntry } from "@/lib/supabase/ledger";
import type { EntryInput, EventMeta, SortMode } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

export function GiftLedgerApp({ canDeleteAllEntries = true, canEditEvent = true, cloudControls, cloudError, currentUserId }: { canDeleteAllEntries?: boolean; canEditEvent?: boolean; cloudControls?: ReactNode; cloudError?: string | null; currentUserId?: string }) {
  const {
    entries,
    eventMeta,
    hydrationError,
    isHydrated,
    pendingDeletion,
    selectedGroup,
    storageError,
    addEntry,
    clearStorageError,
    confirmPendingDeletion,
    requestDeleteEntry,
    resetPersistedLedger,
    setSelectedGroup,
    undoPendingDeletion,
    updateEventMeta,
  } = useGiftLedgerStore();
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    () => [...new Set(visibleEntries.map((entry) => normalizeStoredGroupName(entry.group)).filter(Boolean))],
    [visibleEntries],
  );
  const shouldShowMobileFab = visibleEntries.length > 0;
  const canDeleteEntry = (entry: typeof entries[number]) => canDeleteCloudEntry(entry, currentUserId, canDeleteAllEntries);

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

  if (hydrationError) {
    return <LedgerErrorState message={hydrationError} onDismiss={resetPersistedLedger} />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 lg:px-8">
          <EventMetaBanner canEdit={canEditEvent} eventMeta={eventMeta} entryCount={visibleEntries.length} onSaveAction={handleSaveEventMeta} selectedGroup={selectedGroup} />
          {cloudControls}
        </div>
      </header>

      {storageError || cloudError ? (
        <div className="mx-auto max-w-[1180px] px-4 pt-3 sm:px-6 lg:px-8" role="status">
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-soft)] bg-[var(--ink)] px-4 py-3 text-sm text-[var(--surface)] shadow-[var(--shadow-card)]">
            <p>{storageError ?? cloudError} 이 탭에서는 변경 내용을 계속 확인할 수 있습니다.</p>
            {storageError ? <button className="min-h-10 shrink-0 rounded-[var(--radius-soft)] px-3 font-semibold active:scale-95" onClick={clearStorageError} type="button">닫기</button> : null}
          </div>
        </div>
      ) : null}

      <main className={`${shouldShowMobileFab ? "mobile-fab-clearance " : ""}mx-auto max-w-[1180px] px-4 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-8 lg:px-8 lg:pb-10`}>
        <div className="space-y-4 lg:space-y-5">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <HeroCard label={selectedGroup ?? "전체"} totalAmount={summary.totalAmount} totalPeople={summary.totalPeople} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
              <KpiCard label="평균 금액" value={formatAmountCompact(summary.averageAmount)} />
              <KpiCard label="그룹 수" value={`${summary.groupCount}개`} />
            </div>
          </section>

          <GroupFilter groups={groupSummaries} selectedGroup={selectedGroup} onSelectAction={setSelectedGroup} />

          {visibleEntries.length === 0 ? (
            <EmptyState onAdd={() => setIsSheetOpen(true)} variant="all" />
          ) : sortedEntries.length === 0 ? (
            <EmptyState onClearFilter={() => setSelectedGroup(null)} variant="filtered" />
          ) : (
            <EntryList canDeleteEntry={canDeleteEntry} entries={sortedEntries} hasPendingDeletion={Boolean(pendingDeletion)} key={`${selectedGroup ?? "all"}:${sortMode}`} onDelete={requestDeleteEntry} onSortChange={setSortMode} sortMode={sortMode} />
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
