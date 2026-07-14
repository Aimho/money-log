"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

type AddEntrySheetProps = {
  children: React.ReactNode;
  isOpen: boolean;
  onCloseAction: () => void;
};

export function AddEntrySheet({ children, isOpen, onCloseAction }: AddEntrySheetProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseAction();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCloseAction]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true">
          <motion.button
            aria-label="추가 시트 닫기"
            className="absolute inset-0 bg-[rgba(34,33,29,0.46)]"
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            onClick={onCloseAction}
            transition={prefersReducedMotion ? undefined : { duration: 0.16, ease: "easeOut" }}
            type="button"
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          />
          <motion.div
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            className="sheet-safe-shell relative flex w-full flex-col overflow-hidden rounded-t-[var(--radius-soft)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 28 }}
            transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/70 to-transparent" />
            <div className="relative border-b border-[rgba(34,33,29,0.08)] px-4 pb-4 pt-3">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-[var(--radius-soft)] bg-[rgba(34,33,29,0.14)]" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">빠른 추가</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">이름에서 메모까지 순서대로 입력하면 저장 후 바로 다시 시작합니다.</p>
                </div>
                <button
                  aria-label="시트 닫기"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-soft)] active:scale-95"
                  onClick={onCloseAction}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="sheet-scroll-region px-4 pt-4">
              <div className="pb-1">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
