"use client";

import { create } from "zustand";

import { DEFAULT_EVENT_META } from "@/lib/constants";
import { savePersistedLedger, loadPersistedLedger } from "@/lib/storage";
import type { EntryInput, EventMeta, GiftEntry, PendingDeletion } from "@/lib/types";
import { createEntryId } from "@/lib/utils";

type GiftLedgerState = {
  addEntry: (input: EntryInput) => void;
  clearStorageError: () => void;
  confirmPendingDeletion: () => void;
  entries: GiftEntry[];
  eventMeta: EventMeta;
  hydrate: () => void;
  isHydrated: boolean;
  pendingDeletion: PendingDeletion | null;
  requestDeleteEntry: (entryId: string) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  storageError: string | null;
  undoPendingDeletion: () => void;
  updateEventMeta: (eventMeta: EventMeta) => void;
};

function persistState(entries: GiftEntry[], selectedGroup: string | null, eventMeta: EventMeta) {
  savePersistedLedger({ entries, eventMeta, selectedGroup });
}

export const useGiftLedgerStore = create<GiftLedgerState>((set, get) => ({
  addEntry: (input) => {
    const entry: GiftEntry = {
      ...input,
      createdAt: new Date().toISOString(),
      id: createEntryId(),
    };
    const nextEntries = [entry, ...get().entries];

    try {
      persistState(nextEntries, get().selectedGroup, get().eventMeta);
      set({ entries: nextEntries, storageError: null });
    } catch {
      set({ entries: nextEntries, storageError: "브라우저에 장부를 저장하지 못했습니다." });
    }
  },
  clearStorageError: () => {
    set({ entries: [], eventMeta: DEFAULT_EVENT_META, pendingDeletion: null, selectedGroup: null, storageError: null });
  },
  confirmPendingDeletion: () => {
    const pendingDeletion = get().pendingDeletion;

    if (!pendingDeletion) {
      return;
    }

    const nextEntries = get().entries.filter((entry) => entry.id !== pendingDeletion.entry.id);

    try {
      persistState(nextEntries, get().selectedGroup, get().eventMeta);
      set({ entries: nextEntries, pendingDeletion: null, storageError: null });
    } catch {
      set({ pendingDeletion: null, storageError: "삭제 내용을 브라우저에 저장하지 못했습니다." });
    }
  },
  entries: [],
  eventMeta: DEFAULT_EVENT_META,
  hydrate: () => {
    try {
      const persisted = loadPersistedLedger();
      set({
        entries: persisted.entries,
        eventMeta: persisted.eventMeta,
        isHydrated: true,
        selectedGroup: persisted.selectedGroup,
        storageError: null,
      });
    } catch {
      set({ isHydrated: true, storageError: "저장된 장부를 읽지 못해 기본 상태로 돌아가야 합니다." });
    }
  },
  isHydrated: false,
  pendingDeletion: null,
  requestDeleteEntry: (entryId) => {
    if (get().pendingDeletion) {
      return;
    }

    const entry = get().entries.find((item) => item.id === entryId);

    if (!entry) {
      return;
    }

    set({ pendingDeletion: { deadline: Date.now() + 3500, entry } });
  },
  selectedGroup: null,
  setSelectedGroup: (group) => {
    try {
      persistState(get().entries, group, get().eventMeta);
      set({ selectedGroup: group, storageError: null });
    } catch {
      set({ selectedGroup: group, storageError: "필터 상태를 브라우저에 저장하지 못했습니다." });
    }
  },
  storageError: null,
  undoPendingDeletion: () => {
    set({ pendingDeletion: null });
  },
  updateEventMeta: (eventMeta) => {
    try {
      persistState(get().entries, get().selectedGroup, eventMeta);
      set({ eventMeta, storageError: null });
    } catch {
      set({ storageError: "행사 정보를 브라우저에 저장하지 못했습니다." });
    }
  },
}));
