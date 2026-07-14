"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { PendingDeletion } from "@/lib/types";

type UndoToastProps = {
  isHidden?: boolean;
  onUndoAction: () => void;
  pendingDeletion: PendingDeletion | null;
};

export function UndoToast({ isHidden = false, onUndoAction, pendingDeletion }: UndoToastProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {pendingDeletion && !isHidden ? (
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          className="mobile-toast-offset pointer-events-none fixed inset-x-4 z-50 flex justify-center lg:bottom-6"
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.18, ease: "easeOut" }}
        >
          <div className="surface-panel pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--ink)]">{pendingDeletion.entry.name} 기록을 숨겼어요.</p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">3.5초 안에 취소하지 않으면 완전히 삭제됩니다.</p>
            </div>
            <button className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95" onClick={onUndoAction} type="button">
              실행 취소
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
