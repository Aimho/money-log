import { getGroupDisplayName } from "@/lib/group";
import type { GiftEntry, GroupSummary, SortMode } from "@/lib/types";

type LedgerSummary = {
  averageAmount: number;
  filteredCount: number;
  groupCount: number;
  totalAmount: number;
  totalPeople: number;
};

export function filterEntries(entries: GiftEntry[], selectedGroup: string | null) {
  if (!selectedGroup) {
    return entries;
  }

  return entries.filter((entry) => getGroupDisplayName(entry.group) === selectedGroup);
}

export function sortEntries(entries: GiftEntry[], sortMode: SortMode) {
  return [...entries].sort((left, right) => {
    if (sortMode === "amount") {
      if (right.amount !== left.amount) {
        return right.amount - left.amount;
      }
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function buildGroupSummaries(entries: GiftEntry[]): GroupSummary[] {
  const counter = new Map<string, number>();

  entries.forEach((entry) => {
    const groupName = getGroupDisplayName(entry.group);
    counter.set(groupName, (counter.get(groupName) ?? 0) + 1);
  });

  return [...counter.entries()]
    .map(([name, count]) => ({ count, name }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ko"));
}

export function buildLedgerSummary(allEntries: GiftEntry[], filteredEntries: GiftEntry[]): LedgerSummary {
  const totalAmount = allEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPeople = allEntries.length;
  const averageAmount = totalPeople ? Math.round(totalAmount / totalPeople) : 0;
  const groupCount = new Set(allEntries.map((entry) => getGroupDisplayName(entry.group))).size;

  return {
    averageAmount,
    filteredCount: filteredEntries.length,
    groupCount,
    totalAmount,
    totalPeople,
  };
}
