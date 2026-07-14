export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] items-center px-4 py-10 sm:px-6">
      <section className="surface-panel w-full p-6 sm:p-8">
        <p className="text-sm font-medium text-[var(--ink-faint)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">이 장부 페이지를 찾을 수 없어요.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">주소가 바뀌었거나 준비 중인 화면일 수 있습니다.</p>
      </section>
    </main>
  );
}
