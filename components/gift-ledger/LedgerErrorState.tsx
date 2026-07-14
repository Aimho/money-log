import { RotateCcw } from "lucide-react";

type LedgerErrorStateProps = {
  message: string;
  onDismiss: () => void;
};

export function LedgerErrorState({ message, onDismiss }: LedgerErrorStateProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] items-center px-4 py-10 sm:px-6">
      <section className="surface-panel w-full p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--ink-faint)]">저장소 오류</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">로컬 장부를 읽지 못했어요.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{message}</p>
        <button
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95"
          onClick={onDismiss}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          기본 상태로 다시 열기
        </button>
      </section>
    </main>
  );
}
