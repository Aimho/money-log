"use client";

import { RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] items-center px-4 py-10 sm:px-6">
      <section className="surface-panel w-full p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--ink-faint)]">페이지 오류</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">장부 화면을 불러오지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">잠시 후 다시 시도해 주세요. 로컬 데이터는 브라우저에 그대로 남아 있습니다.</p>
        <button
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95"
          onClick={reset}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          다시 시도
        </button>
      </section>
    </main>
  );
}
