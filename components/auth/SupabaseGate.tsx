"use client";

import type { Session } from "@supabase/supabase-js";
import { Cloud, LogOut, RefreshCw, Share2, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GiftLedgerApp } from "@/components/gift-ledger/GiftLedgerApp";
import { LedgerSkeleton } from "@/components/gift-ledger/LedgerSkeleton";
import { buildMagicLinkRedirect } from "@/lib/auth-redirect";
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
import { createSupabaseBrowserClient, getSupabaseConfig } from "@/lib/supabase/client";
import { clearLocalLedgerState, getActiveLedgerId, hasCompletedLocalImport, loadLedgerOutbox, loadPersistedLedger, loadUserLedger, markLocalImportComplete, saveLedgerOutbox, setActiveLedgerId } from "@/lib/storage";
import { EMPTY_OUTBOX, acknowledgeOutbox, mergeOutbox, reconcileRemote, reIdForImport } from "@/lib/sync-state";
import type { PersistedLedgerState } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

type SyncState = "idle" | "syncing" | "synced" | "error";

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

  useEffect(() => {
    if (!client) return;
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

  if (!getSupabaseConfig() || !client) return <SupabaseSetup />;
  if (isCheckingSession) return <AuthLoading />;
  if (!session) return <EmailOtpForm client={client} />;
  return <SignedInLedger client={client} session={session} />;
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

    const inviteToken = new URLSearchParams(window.location.search).get("invite");
    const cachedActiveLedger = selectedLedgerId ?? getActiveLedgerId(userId);
    if (inviteToken) hydrateForUser(userId);
    else if (cachedActiveLedger) {
      ledgerIdRef.current = cachedActiveLedger;
      hydrateForLedger(userId, cachedActiveLedger);
    } else hydrateForUser(userId);
    const preferredLedger = inviteToken
      ? acceptLedgerInvite(client, inviteToken).then((ledgerId) => {
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
        if (!hasCompletedLocalImport(userId) && !outbox.importPending && hasLocalContent(local)) {
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

function EmailOtpForm({ client }: { client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>> }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildMagicLinkRedirect(window.location), shouldCreateUser: true },
    });
    setIsSending(false);
    setMessage(error ? "인증 메일을 보내지 못했습니다. 이메일을 확인해 주세요." : "메일함에서 로그인 링크를 눌러 주세요.");
  };

  return (
    <AuthShell>
      <p className="text-sm font-semibold text-[var(--accent)]">축하금 장부</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">내 장부를 이어서 기록하세요</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">이메일로 받은 로그인 링크를 누르면 다른 기기에서도 같은 장부를 볼 수 있어요.</p>
      <form className="mt-6" onSubmit={submit}>
        <label className="text-sm font-semibold" htmlFor="login-email">이메일</label>
        <input className="mt-2 min-h-11 w-full rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--background)] px-3 outline-none focus:border-[var(--accent)]" id="login-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <button className="mt-3 min-h-11 w-full rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 font-semibold text-white active:scale-[0.99] disabled:opacity-60" disabled={isSending} type="submit">
          {isSending ? "보내는 중…" : "로그인 링크 받기"}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
    </AuthShell>
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

function SupabaseSetup() {
  return <AuthShell><p className="text-sm font-semibold text-[var(--accent)]">설정 필요</p><h1 className="mt-2 text-2xl font-bold">클라우드 연결을 준비해 주세요</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]"><code>.env.local</code>에 Supabase URL과 Publishable Key를 추가하면 로그인 화면이 열립니다. 자세한 순서는 README를 확인해 주세요.</p></AuthShell>;
}

function AuthLoading() {
  return <LedgerSkeleton />;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4 text-[var(--ink)]"><section className="w-full max-w-md rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]">{children}</section></main>;
}
