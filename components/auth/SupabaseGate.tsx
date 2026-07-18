"use client";

import type { Session } from "@supabase/supabase-js";
import { Cloud, CloudUpload, LogOut, RefreshCw, Share2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GiftLedgerApp } from "@/components/gift-ledger/GiftLedgerApp";
import { LedgerSkeleton } from "@/components/gift-ledger/LedgerSkeleton";
import { buildAuthRedirect } from "@/lib/auth-redirect";
import { configureCloudSync } from "@/lib/cloud-sync";
import type { CloudSyncChanges } from "@/lib/cloud-sync";
import {
  createCloudLedger,
  createLedgerInvite,
  acceptLedgerInvite,
  canConfirmLedgerDeletion,
  deleteCloudLedger,
  fetchCloudLedger,
  mergeForImport,
  listCloudLedgers,
  syncCloudLedger,
  type CloudLedger,
  type LedgerListItem,
} from "@/lib/supabase/ledger";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearLocalLedgerState, clearPersistedLedger, getActiveLedgerId, hasCompletedLocalImport, loadLedgerOutbox, loadPersistedLedger, loadUserLedger, markLocalImportComplete, saveLedgerOutbox, setActiveLedgerId } from "@/lib/storage";
import { EMPTY_OUTBOX, acknowledgeOutbox, mergeOutbox, reconcileRemote, reIdForImport } from "@/lib/sync-state";
import type { PersistedLedgerState } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

type SyncState = "idle" | "syncing" | "synced" | "error";
const PENDING_INVITE_KEY = "money-log:pending-invite";

function normalizeInviteToken(value: string | null) {
  return value && value.length <= 256 && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

function getPendingInviteToken() {
  return normalizeInviteToken(window.sessionStorage.getItem(PENDING_INVITE_KEY));
}

function hasLocalContent(state: PersistedLedgerState) {
  return state.entries.length > 0 || Boolean(state.eventMeta.name || state.eventMeta.date);
}

function describeCloudError(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : null;
  const message = typeof candidate.message === "string" ? candidate.message : null;

  if (!code && !message) return fallback;
  return `${fallback}${code ? ` (${code})` : ""}${message ? `: ${message}` : ""}`;
}

export function SupabaseGate() {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(client));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryInvite = normalizeInviteToken(searchParams.get("invite"));
    if (queryInvite) window.sessionStorage.setItem(PENDING_INVITE_KEY, queryInvite);
    if (searchParams.has("invite")) {
      searchParams.delete("invite");
      const remainingSearch = searchParams.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}${window.location.hash}`);
    }
    setHasInvite(Boolean(queryInvite ?? getPendingInviteToken()));
    if (!client) {
      setIsCheckingSession(false);
      return;
    }
    let cancelled = false;
    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setIsCheckingSession(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!cancelled) setSession(nextSession);
    });
    return () => { cancelled = true; data.subscription.unsubscribe(); };
  }, [client]);

  if (isCheckingSession) return <AuthLoading />;
  if (session && client) return <SignedInLedger client={client} session={session} />;
  return (
    <GuestLedger
      client={client}
      hasInvite={hasInvite}
      isAuthOpen={isAuthOpen}
      onAuthClose={() => setIsAuthOpen(false)}
      onAuthOpen={() => setIsAuthOpen(true)}
      onInviteLeave={() => setHasInvite(false)}
    />
  );
}

function GuestLedger({ client, hasInvite, isAuthOpen, onAuthClose, onAuthOpen, onInviteLeave }: {
  client: ReturnType<typeof createSupabaseBrowserClient>;
  hasInvite: boolean;
  isAuthOpen: boolean;
  onAuthClose: () => void;
  onAuthOpen: () => void;
  onInviteLeave: () => void;
}) {
  const hydrate = useGiftLedgerStore((state) => state.hydrate);
  const [isLocalReady, setIsLocalReady] = useState(false);

  useEffect(() => {
    configureCloudSync(null);
    hydrate();
    setIsLocalReady(true);
  }, [hydrate]);

  const leaveInvite = () => {
    window.sessionStorage.removeItem(PENDING_INVITE_KEY);
    window.history.replaceState({}, "", window.location.pathname);
    onInviteLeave();
    onAuthClose();
  };

  if (!isLocalReady) return <LedgerSkeleton />;

  return (
    <>
      <GiftLedgerApp
        cloudControls={
          <div className="mt-2 flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Cloud aria-hidden="true" size={14} />
              <span className="truncate">이 기기에 저장됨</span>
            </span>
            <button
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 font-semibold text-[var(--ink)] transition-transform active:scale-95"
              onClick={onAuthOpen}
              type="button"
            >
              <CloudUpload aria-hidden="true" size={15} /> 클라우드 연결
            </button>
          </div>
        }
      />
      {hasInvite || isAuthOpen ? (
        <KakaoAuthDialog client={client} isInvite={hasInvite} onClose={hasInvite ? leaveInvite : onAuthClose} />
      ) : null}
    </>
  );
}

function SignedInLedger({ client, session }: { client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>; session: Session }) {
  const hydrateForLedger = useGiftLedgerStore((state) => state.hydrateForLedger);
  const hydrateForUser = useGiftLedgerStore((state) => state.hydrateForUser);
  const replaceLedger = useGiftLedgerStore((state) => state.replaceLedger);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<LedgerListItem[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingLedger, setIsDeletingLedger] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [importChoice, setImportChoice] = useState<{ local: PersistedLedgerState; remote: CloudLedger | null } | null>(null);
  const ledgerIdRef = useRef<string | null>(null);
  const isOwnerRef = useRef(true);
  const syncChainRef = useRef(Promise.resolve());
  const pendingDeletionIdsRef = useRef(new Set<string>());
  const pendingUpsertIdsRef = useRef(new Set<string>());
  const importPendingRef = useRef(false);
  const metadataPendingRef = useRef(false);
  const generationRef = useRef(0);
  const isImportingRef = useRef(false);
  const userId = session.user.id;

  const queueSync = useCallback(
    (state: PersistedLedgerState, changes: CloudSyncChanges = {}) => {
      const generation = generationRef.current;
      const syncUserId = userId;
      const isCurrent = () => generationRef.current === generation && session.user.id === syncUserId;
      const normalizedChanges: CloudSyncChanges = {
        ...changes,
        importRevision: changes.importPending ? changes.importRevision ?? crypto.randomUUID() : changes.importRevision,
      };
      normalizedChanges.deletedEntryIds?.forEach((id) => {
        pendingDeletionIdsRef.current.add(id);
        pendingUpsertIdsRef.current.delete(id);
      });
      normalizedChanges.upsertEntryIds?.forEach((id) => pendingUpsertIdsRef.current.add(id));
      if (normalizedChanges.importPending) importPendingRef.current = true;
      if (normalizedChanges.metadataPending) metadataPendingRef.current = true;
      const ledgerForOutbox = ledgerIdRef.current;
      let acknowledgedOutbox = EMPTY_OUTBOX;
      if (ledgerForOutbox) {
        const current = loadLedgerOutbox(userId, ledgerForOutbox);
        acknowledgedOutbox = mergeOutbox(current, state, normalizedChanges);
        saveLedgerOutbox(userId, ledgerForOutbox, acknowledgedOutbox);
      }
      if (isCurrent()) setSyncState("syncing");
      syncChainRef.current = syncChainRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!isCurrent()) return;
          let ledgerId = ledgerIdRef.current;
          if (!ledgerId) {
            ledgerId = await createCloudLedger(client, state.eventMeta);
            ledgerIdRef.current = ledgerId;
            setActiveLedgerId(userId, ledgerId);
            acknowledgedOutbox = mergeOutbox(EMPTY_OUTBOX, state, normalizedChanges);
            saveLedgerOutbox(userId, ledgerId, acknowledgedOutbox);
          }
          const deletions = acknowledgedOutbox.deletedEntryIds;
          const upserts = acknowledgedOutbox.upsertEntries.map((entry) => entry.id);
          await syncCloudLedger(client, userId, ledgerId, state, isOwnerRef.current, deletions, upserts);
          if (!isCurrent() || ledgerIdRef.current !== ledgerId) return;
          const latestOutbox = loadLedgerOutbox(userId, ledgerId);
          const remainingOutbox = acknowledgeOutbox(latestOutbox, acknowledgedOutbox, state, useGiftLedgerStore.getState());
          saveLedgerOutbox(userId, ledgerId, remainingOutbox);
          pendingDeletionIdsRef.current = new Set(remainingOutbox.deletedEntryIds);
          pendingUpsertIdsRef.current = new Set(remainingOutbox.upsertEntries.map((entry) => entry.id));
          importPendingRef.current = remainingOutbox.importPending;
          metadataPendingRef.current = remainingOutbox.metadataPending;
          if (acknowledgedOutbox.importPending) markLocalImportComplete(userId);
          setCloudError(null);
          setSyncState("synced");
        })
        .catch((error: unknown) => {
          if (!isCurrent()) return;
          setCloudError(describeCloudError(error, "클라우드 저장에 실패했습니다."));
          setSyncState("error");
        });
    },
    [client, session.user.id, userId],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    let cancelled = false;
    isImportingRef.current = false;
    let releaseSync: () => void = () => undefined;
    const isCurrent = () => !cancelled && generationRef.current === generation;
    configureCloudSync(null);
    const local = loadPersistedLedger();

    const inviteToken = getPendingInviteToken();
    const cachedActiveLedger = selectedLedgerId ?? getActiveLedgerId(userId);
    if (inviteToken) hydrateForUser(userId);
    else if (cachedActiveLedger) {
      ledgerIdRef.current = cachedActiveLedger;
      hydrateForLedger(userId, cachedActiveLedger);
    } else hydrateForUser(userId);
    const preferredLedger = inviteToken
      ? acceptLedgerInvite(client, inviteToken).then((ledgerId) => {
          window.sessionStorage.removeItem(PENDING_INVITE_KEY);
          if (isCurrent()) window.history.replaceState({}, "", window.location.pathname);
          return ledgerId;
        })
      : Promise.resolve(cachedActiveLedger ?? undefined);

    void preferredLedger.then(async (preferredId) => {
      let ledgerList = await listCloudLedgers(client);
      let ledgerId = preferredId && ledgerList.some((item) => item.id === preferredId) ? preferredId : ledgerList[0]?.id;
      if (!ledgerId) {
        ledgerId = await createCloudLedger(client, { date: "", name: "" });
        ledgerList = await listCloudLedgers(client);
      }
      if (!isCurrent()) return null;
      setLedgers(ledgerList);
      setSelectedLedgerId(ledgerId);
      const selected = ledgerList.find((item) => item.id === ledgerId);
      isOwnerRef.current = selected?.isOwner ?? true;
      setIsOwner(isOwnerRef.current);
      ledgerIdRef.current = ledgerId;
      setActiveLedgerId(userId, ledgerId);
      hydrateForLedger(userId, ledgerId);
      const cached = loadUserLedger(userId, ledgerId);
      const outbox = loadLedgerOutbox(userId, ledgerId);
      pendingDeletionIdsRef.current = new Set(outbox.deletedEntryIds);
      pendingUpsertIdsRef.current = new Set(outbox.upsertEntries.map((entry) => entry.id));
      importPendingRef.current = outbox.importPending;
      metadataPendingRef.current = outbox.metadataPending;
      if (outbox.deletedEntryIds.length || outbox.upsertEntries.length || outbox.metadataPending) {
        await syncCloudLedger(client, userId, ledgerId, cached, isOwnerRef.current, outbox.deletedEntryIds, outbox.upsertEntries.map((entry) => entry.id));
        if (!isCurrent()) return null;
        saveLedgerOutbox(userId, ledgerId, EMPTY_OUTBOX);
        if (outbox.importPending) markLocalImportComplete(userId);
      }
      const remote = await fetchCloudLedger(client, ledgerId);
      return { cached, outbox, remote };
    }).then((result) => {
        if (!result || !isCurrent()) return;
        const { cached, outbox, remote } = result;
        ledgerIdRef.current = remote?.ledgerId ?? null;
        if (remote) setActiveLedgerId(userId, remote.ledgerId);
        setIsOwner(remote?.isOwner ?? true);
        isOwnerRef.current = remote?.isOwner ?? true;
        if (remote?.isOwner && !hasCompletedLocalImport(userId) && !outbox.importPending && hasLocalContent(local)) {
          setImportChoice({ local, remote });
          setIsReady(true);
          return;
        }

        if (remote) replaceLedger(reconcileRemote(remote, cached, outbox));
        releaseSync = configureCloudSync(queueSync);
        if (remote) setSyncState("synced");
        else {
          const cachedState = useGiftLedgerStore.getState();
          queueSync(cachedState, { upsertEntryIds: cachedState.entries.map((entry) => entry.id) });
        }
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        releaseSync = configureCloudSync(queueSync);
        setCloudError(describeCloudError(error, "클라우드 장부를 불러오지 못했습니다."));
        setSyncState("error");
        setIsReady(true);
      });

    return () => { cancelled = true; generationRef.current += 1; releaseSync(); };
  }, [client, hydrateForLedger, hydrateForUser, queueSync, replaceLedger, selectedLedgerId, userId]);

  const finishImport = (shouldImport: boolean) => {
    if (!importChoice || isImportingRef.current) return;
    isImportingRef.current = true;
    const importedLocal = reIdForImport(importChoice.local);
    const nextState = shouldImport
      ? mergeForImport(importChoice.remote, importedLocal)
      : importChoice.remote ?? useGiftLedgerStore.getState();
    if (importChoice.remote) ledgerIdRef.current = importChoice.remote.ledgerId;
    replaceLedger(nextState);
    configureCloudSync(queueSync);
    if (shouldImport || !importChoice.remote) queueSync(nextState, { importPending: shouldImport, metadataPending: shouldImport, upsertEntryIds: shouldImport ? importedLocal.entries.map((entry) => entry.id) : nextState.entries.map((entry) => entry.id) });
    else markLocalImportComplete(userId);
    if (shouldImport) clearPersistedLedger();
    setImportChoice(null);
  };

  const shareLedger = async () => {
    const ledgerId = ledgerIdRef.current;
    if (!ledgerId) return;
    try {
      const token = await createLedgerInvite(client, ledgerId);
      const url = `${window.location.origin}${window.location.pathname}?invite=${token}`;
      await navigator.clipboard.writeText(url);
      setShareMessage("7일 동안 유효한 초대 링크를 복사했습니다.");
    } catch {
      setShareMessage("초대 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const switchLedger = (ledgerId: string) => {
    configureCloudSync(null);
    setIsReady(false);
    setSelectedLedgerId(ledgerId);
  };

  const deleteLedger = async () => {
    if (!deleteTarget || isDeletingLedger) return;
    setIsDeletingLedger(true);
    setDeleteError(null);
    configureCloudSync(null);

    try {
      // Drain work already queued for this ledger before the server permanently
      // removes it. Disabling the listener above prevents new work from joining.
      await syncChainRef.current.catch(() => undefined);
      await deleteCloudLedger(client, deleteTarget.id, deleteTarget.name);

      // The server is authoritative: device state is removed only after its ack.
      generationRef.current += 1;
      clearLocalLedgerState(userId, deleteTarget.id);
      ledgerIdRef.current = null;
      pendingDeletionIdsRef.current.clear();
      pendingUpsertIdsRef.current.clear();
      importPendingRef.current = false;
      metadataPendingRef.current = false;
      setLedgers((current) => current.filter((ledger) => ledger.id !== deleteTarget.id));
      setDeleteTarget(null);
      setIsReady(false);
      // Re-enter the existing hydration path. It selects another accessible
      // ledger, or creates a blank one when this was the user's last ledger.
      setSelectedLedgerId(null);
    } catch (error: unknown) {
      configureCloudSync(queueSync);
      setDeleteError(describeCloudError(error, "클라우드 장부를 삭제하지 못했습니다."));
    } finally {
      setIsDeletingLedger(false);
    }
  };

  if (!isReady) return <AuthLoading />;

  return (
    <>
      <GiftLedgerApp
        canEditEvent={isOwner}
        cloudControls={
          <div className="mt-2 flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Cloud aria-hidden="true" size={14} />
              <span className="truncate">{syncState === "syncing" ? "동기화 중" : syncState === "error" ? "기기에 저장됨" : "클라우드 동기화됨"}</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {ledgers.length > 1 ? (
                <label className="sr-only" htmlFor="ledger-switcher">장부 선택</label>
              ) : null}
              {ledgers.length > 1 ? (
                <select className="min-h-10 max-w-32 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-semibold" id="ledger-switcher" onChange={(event) => switchLedger(event.target.value)} value={selectedLedgerId ?? ""}>
                  {ledgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.name}</option>)}
                </select>
              ) : null}
              {isOwner && ledgerIdRef.current ? (
                <button className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 font-semibold active:scale-95" onClick={() => void shareLedger()} type="button">
                  <Share2 aria-hidden="true" size={14} /> 공유
                </button>
              ) : null}
              {isOwner && ledgerIdRef.current ? (
                <button
                  aria-label="현재 클라우드 장부 삭제"
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-red-700 transition-transform active:scale-95"
                  onClick={() => {
                    const current = ledgers.find((ledger) => ledger.id === ledgerIdRef.current);
                    if (!current) return;
                    setDeleteError(null);
                    setDeleteTarget({ id: current.id, name: current.name || "이름 없는 행사" });
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              ) : null}
              {syncState === "error" ? (
                <button className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 font-semibold active:scale-95" onClick={() => queueSync(useGiftLedgerStore.getState())} type="button">
                  <RefreshCw aria-hidden="true" size={14} /> 재시도
                </button>
              ) : null}
              <button className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 font-semibold active:scale-95" onClick={() => void client.auth.signOut()} type="button">
                <LogOut aria-hidden="true" size={14} /> 로그아웃
              </button>
            </div>
          </div>
        }
        cloudError={cloudError}
      />
      {shareMessage ? <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[var(--radius-soft)] bg-[var(--ink)] px-4 py-3 text-center text-sm text-[var(--surface)] shadow-[var(--shadow-panel)]" role="status">{shareMessage}</div> : null}
      {importChoice ? <ImportDialog hasRemote={Boolean(importChoice.remote)} onChoose={finishImport} /> : null}
      {deleteTarget ? (
        <DeleteLedgerDialog
          error={deleteError}
          isDeleting={isDeletingLedger}
          ledgerName={deleteTarget.name}
          onCancel={() => {
            if (!isDeletingLedger) setDeleteTarget(null);
          }}
          onConfirm={() => void deleteLedger()}
        />
      ) : null}
    </>
  );
}

function DeleteLedgerDialog({ error, isDeleting, ledgerName, onCancel, onConfirm }: { error: string | null; isDeleting: boolean; ledgerName: string; onCancel: () => void; onConfirm: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const canDelete = canConfirmLedgerDeletion(confirmation, ledgerName);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overscroll-contain bg-black/35 p-4" role="presentation">
      <section ref={dialogRef} aria-describedby="delete-ledger-description" aria-labelledby="delete-ledger-title" aria-modal="true" className="w-full max-w-md rounded-[var(--radius-soft)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]" role="dialog">
        <div className="flex items-center gap-2 text-red-800">
          <span className="grid size-8 place-items-center rounded-full bg-red-50" aria-hidden="true"><Trash2 size={16} /></span>
          <p className="text-xs font-bold">되돌릴 수 없는 작업</p>
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-balance" id="delete-ledger-title">클라우드 장부를 영구 삭제할까요?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)] text-pretty" id="delete-ledger-description">모든 기록과 초대 링크가 함께 삭제되며, 공유 멤버도 즉시 접근할 수 없게 됩니다.</p>
        <label className="mt-5 block text-sm font-semibold" htmlFor="delete-ledger-confirmation">
          확인을 위해 <strong className="text-red-800">{ledgerName}</strong> 입력
        </label>
        <input
          autoComplete="off"
          autoFocus
          className="mt-2 min-h-11 w-full rounded-[var(--radius-soft)] border border-red-200 bg-[var(--background)] px-3 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/15"
          disabled={isDeleting}
          id="delete-ledger-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          spellCheck={false}
          value={confirmation}
        />
        {error ? <p className="mt-3 text-sm leading-5 text-red-800" role="alert">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-[var(--radius-soft)] border border-[var(--border)] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50" disabled={isDeleting} onClick={onCancel} type="button">취소</button>
          <button className="min-h-11 rounded-[var(--radius-soft)] bg-red-800 px-3 font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canDelete || isDeleting} onClick={onConfirm} type="button">
            {isDeleting ? "삭제하는 중…" : "영구 삭제"}
          </button>
        </div>
      </section>
    </div>
  );
}

function KakaoAuthDialog({ client, isInvite, onClose }: {
  client: ReturnType<typeof createSupabaseBrowserClient>;
  isInvite: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const signIn = async () => {
    if (!client) {
      setError("클라우드 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setError(null);
    setIsConnecting(true);
    const { error: authError } = await client.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: buildAuthRedirect(window.location) },
    });
    if (authError) {
      setError(describeCloudError(authError, "카카오 로그인을 시작하지 못했습니다."));
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overscroll-contain bg-black/35 p-4" role="presentation">
      <section
        aria-describedby="kakao-auth-description"
        aria-labelledby="kakao-auth-title"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-[var(--radius-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]"
        role="dialog"
      >
        <button
          aria-label={isInvite ? "초대 참여하지 않고 닫기" : "클라우드 연결 닫기"}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-[var(--radius-soft)] text-[var(--muted)] transition-transform active:scale-95"
          disabled={isConnecting}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <p className="text-xs font-bold text-[var(--accent)]">{isInvite ? "공유 장부 초대" : "선택 기능"}</p>
        <h2 className="mt-2 pr-8 text-xl font-bold tracking-[-0.02em] text-balance" id="kakao-auth-title">
          {isInvite ? "카카오 로그인 후 함께 기록하세요" : "이 장부를 클라우드에 연결할까요?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] text-pretty" id="kakao-auth-description">
          {isInvite
            ? "초대받은 장부는 참여자를 확인해야 열 수 있어요. 로그인 후 편집자로 바로 연결됩니다."
            : "현재 기록은 이미 이 기기에 저장되어 있어요. 로그인하면 다른 기기에서도 보고 공유할 수 있습니다."}
        </p>
        <button
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-soft)] bg-[#FEE500] px-4 font-semibold text-[#191919] transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          disabled={isConnecting}
          onClick={() => void signIn()}
          type="button"
        >
          <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#191919] text-[10px] font-black text-[#FEE500]">K</span>
          {isConnecting ? "카카오로 이동하는 중…" : "카카오로 계속하기"}
        </button>
        {error ? <p className="mt-3 text-sm leading-5 text-red-800" role="alert">{error}</p> : null}
        <p className="mt-4 text-center text-xs leading-5 text-[var(--ink-faint)]">
          로그인 없이도 이 기기의 내 장부는 계속 사용할 수 있습니다.
        </p>
      </section>
    </div>
  );
}

function ImportDialog({ hasRemote, onChoose }: { hasRemote: boolean; onChoose: (shouldImport: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="presentation">
      <section aria-labelledby="import-title" aria-modal="true" className="w-full max-w-md rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]" role="dialog">
        <p className="text-xs font-semibold text-[var(--accent)]">최초 1회 확인</p>
        <h2 className="mt-1 text-xl font-bold" id="import-title">이 기기의 기존 장부를 가져올까요?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">가져오기를 선택해야만 기존 로컬 기록이 계정에 추가됩니다.{hasRemote ? " 클라우드 기록은 지우지 않고 합칩니다." : ""}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button className="min-h-11 rounded-[var(--radius-soft)] border border-[var(--border)] font-semibold active:scale-[0.98]" onClick={() => onChoose(false)} type="button">가져오지 않기</button>
          <button className="min-h-11 rounded-[var(--radius-soft)] bg-[var(--accent)] font-semibold text-white active:scale-[0.98]" onClick={() => onChoose(true)} type="button">기존 장부 가져오기</button>
        </div>
      </section>
    </div>
  );
}

function AuthLoading() {
  return <LedgerSkeleton />;
}
