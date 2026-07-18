import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/constants";
import type { GiftEntry } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

const sampleEntries: GiftEntry[] = [
  {
    amount: 100000,
    createdAt: "2026-07-14T00:00:00.000Z",
    group: "친구",
    id: "a",
    memo: "A",
    name: "홍길동",
  },
  {
    amount: 50000,
    createdAt: "2026-07-14T00:00:01.000Z",
    group: "가족",
    id: "b",
    memo: "B",
    name: "김영희",
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  useGiftLedgerStore.setState({
    entries: [],
    eventMeta: { date: "", name: "" },
    hydrationError: null,
    isHydrated: false,
    pendingDeletion: null,
    selectedGroup: null,
    storageError: null,
  });
});

function stubLocalStorage(initialValue?: string) {
  const values = new Map<string, string>();

  if (initialValue !== undefined) {
    values.set(STORAGE_KEY, initialValue);
  }

  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };

  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

describe("useGiftLedgerStore delete flow", () => {
  it("keeps the first pending deletion locked until the undo window resolves", () => {
    useGiftLedgerStore.setState({
      entries: sampleEntries,
      eventMeta: { date: "", name: "" },
      hydrationError: null,
      isHydrated: true,
      pendingDeletion: null,
      selectedGroup: null,
      storageError: null,
    });

    useGiftLedgerStore.getState().requestDeleteEntry("a");
    const firstPending = useGiftLedgerStore.getState().pendingDeletion;

    useGiftLedgerStore.getState().requestDeleteEntry("b");
    const secondPending = useGiftLedgerStore.getState().pendingDeletion;

    expect(firstPending?.entry.id).toBe("a");
    expect(secondPending?.entry.id).toBe("a");
  });

  it("keeps a confirmed deletion visible in memory when persistence fails", () => {
    const localStorage = stubLocalStorage();
    localStorage.setItem.mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    useGiftLedgerStore.setState({
      entries: sampleEntries,
      eventMeta: { date: "", name: "" },
      hydrationError: null,
      isHydrated: true,
      pendingDeletion: null,
      selectedGroup: null,
      storageError: null,
    });

    useGiftLedgerStore.getState().requestDeleteEntry("a");
    useGiftLedgerStore.getState().confirmPendingDeletion();

    expect(useGiftLedgerStore.getState()).toMatchObject({
      entries: [sampleEntries[1]],
      pendingDeletion: null,
      storageError: "삭제 내용을 브라우저에 저장하지 못했습니다.",
    });
  });
});

describe("useGiftLedgerStore persistence recovery", () => {
  it("separates corrupted hydration data from non-blocking write errors", () => {
    stubLocalStorage("not-json");

    useGiftLedgerStore.getState().hydrate();

    expect(useGiftLedgerStore.getState()).toMatchObject({
      hydrationError: "저장된 장부 데이터가 손상되어 읽을 수 없습니다.",
      isHydrated: true,
      storageError: null,
    });
  });

  it("removes corrupted data before reopening the empty ledger", () => {
    const localStorage = stubLocalStorage("not-json");
    useGiftLedgerStore.getState().hydrate();

    useGiftLedgerStore.getState().resetPersistedLedger();

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(useGiftLedgerStore.getState()).toMatchObject({
      entries: [],
      hydrationError: null,
      selectedGroup: null,
    });
  });

  it("keeps an event edit visible when persistence fails", () => {
    const localStorage = stubLocalStorage();
    localStorage.setItem.mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const eventMeta = { date: "2026.07.18", name: "민지 결혼식" };

    useGiftLedgerStore.getState().updateEventMeta(eventMeta);

    expect(useGiftLedgerStore.getState()).toMatchObject({
      eventMeta,
      hydrationError: null,
      storageError: "행사 정보를 브라우저에 저장하지 못했습니다.",
    });
  });
});
