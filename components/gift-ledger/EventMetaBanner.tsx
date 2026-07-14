"use client";

import { CalendarDays, Check, NotebookPen, PencilLine, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { EventMeta } from "@/lib/types";

type EventMetaBannerProps = {
  eventMeta: EventMeta;
  entryCount: number;
  onSaveAction: (eventMeta: EventMeta) => void;
  selectedGroup: string | null;
};

export function EventMetaBanner({ entryCount, eventMeta, onSaveAction, selectedGroup }: EventMetaBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EventMeta>(eventMeta);
  const hasMeta = useMemo(() => Boolean(eventMeta.name.trim() || eventMeta.date.trim()), [eventMeta.date, eventMeta.name]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(eventMeta);
    }
  }, [eventMeta, isEditing]);

  const startEditing = () => {
    setDraft(eventMeta);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(eventMeta);
    setIsEditing(false);
  };

  const saveEditing = () => {
    onSaveAction({
      date: draft.date.trim(),
      name: draft.name.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="surface-card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          <NotebookPen className="h-3.5 w-3.5" />
          Ceremony notebook
        </div>

        {isEditing ? (
          <form
            className="mt-2 flex flex-col gap-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            onSubmit={(event) => {
              event.preventDefault();
              saveEditing();
            }}
          >
            <input
              className="focus-ring min-h-11 w-full rounded-[var(--radius-soft)] border bg-white px-3 text-base font-semibold tracking-[-0.03em] text-[var(--ink)] placeholder:text-[var(--ink-faint)] sm:text-lg"
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="예: 민지 결혼식"
              value={draft.name}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
                <input
                  className="focus-ring min-h-11 w-full rounded-[var(--radius-soft)] border bg-white pl-10 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
                  onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  placeholder="예: 2026.06.26 예식"
                  value={draft.date}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm font-medium text-[var(--ink)] active:scale-95"
                  onClick={cancelEditing}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  취소
                </button>
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] bg-[var(--accent)] px-3 text-sm font-semibold text-white active:scale-95" type="submit">
                  <Check className="h-4 w-4" />
                  저장
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <h1 className={`mt-1 truncate text-lg font-semibold tracking-[-0.03em] sm:text-xl ${hasMeta ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"}`}>
              {eventMeta.name || "행사 이름을 입력해 주세요"}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {hasMeta ? "행사 정보는 이 브라우저에 저장되어 다음 방문 때도 이어집니다." : "아직 행사 정보가 비어 있어요. 이름과 날짜를 저장하면 장부를 구분하기 쉬워집니다."}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]">
        <div className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-3">
          <CalendarDays className="h-4 w-4 text-[var(--ink-faint)]" />
          <span>{eventMeta.date || "날짜 미설정"}</span>
        </div>
        <div className="inline-flex min-h-11 items-center rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[var(--ink)]">
          {selectedGroup ? `${selectedGroup} · ${entryCount}건` : `전체 ${entryCount}건`}
        </div>
        {!isEditing ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[var(--ink)] active:scale-95"
            onClick={startEditing}
            type="button"
          >
            <PencilLine className="h-4 w-4 text-[var(--ink-faint)]" />
            {hasMeta ? "수정" : "행사 정보 입력"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
