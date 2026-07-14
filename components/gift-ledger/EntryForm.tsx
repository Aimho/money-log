"use client";

import { Mic, MicOff, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { QUICK_AMOUNT_OPTIONS } from "@/lib/constants";
import { formatAmountField, parseAmountInput } from "@/lib/amount";
import type { EntryInput, GiftEntry, VoiceStep } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";

type EntryFormProps = {
  entries: GiftEntry[];
  existingGroups: string[];
  onSubmitAction: (input: EntryInput) => void;
};

type FormValues = {
  amountText: string;
  group: string;
  memo: string;
  name: string;
};

const INITIAL_VALUES: FormValues = {
  amountText: "",
  group: "",
  memo: "",
  name: "",
};

export function EntryForm({ entries, existingGroups, onSubmitAction }: EntryFormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [formError, setFormError] = useState<string | null>(null);
  const activeFieldRef = useRef<VoiceStep | "memo" | null>("name");
  const nameRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);

  const duplicateName = useMemo(() => {
    const normalized = values.name.trim().toLocaleLowerCase();

    if (!normalized) {
      return false;
    }

    return entries.some((entry) => entry.name.trim().toLocaleLowerCase() === normalized);
  }, [entries, values.name]);

  const moveToField = (field: VoiceStep | "memo" | "submit") => {
    const targetMap = {
      amount: amountRef.current,
      group: groupRef.current,
      memo: memoRef.current,
      name: nameRef.current,
      submit: null,
    };

    const target = targetMap[field];

    if (target) {
      if (field !== "submit") {
        activeFieldRef.current = field;
      }
      target.focus();
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.select();
      }
      return;
    }

    handleSubmit();
  };

  const voice = useVoiceInput({
    onCaptured: (step, transcript) => {
      setFormError(null);
      setValues((current) => {
        if (step === "amount") {
          const parsed = parseAmountInput(transcript);
          return {
            ...current,
            amountText: parsed ? formatAmountField(parsed) : transcript,
          };
        }

        return {
          ...current,
          [step]: transcript,
        };
      });
    },
    onStepResolved: (nextStep) => {
      requestAnimationFrame(() => {
        moveToField(nextStep ?? "memo");
      });
    },
    values: {
      amount: values.amountText,
      group: values.group,
      name: values.name,
    },
  });

  const updateField = (field: keyof FormValues, value: string) => {
    setFormError(null);
    setValues((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    voice.stop();
    setFormError(null);
    setValues(INITIAL_VALUES);
    requestAnimationFrame(() => {
      activeFieldRef.current = "name";
      nameRef.current?.focus();
    });
  };

  const handleSubmit = () => {
    const name = values.name.trim();
    const group = values.group.trim();
    const memo = values.memo.trim();
    const amount = parseAmountInput(values.amountText);

    if (!name) {
      setFormError("이름을 먼저 입력해 주세요.");
      moveToField("name");
      return;
    }

    if (!amount || amount <= 0) {
      setFormError("금액을 올바르게 입력해 주세요.");
      moveToField("amount");
      return;
    }

    onSubmitAction({ amount, group, memo, name });
    resetForm();
  };

  const handleEnterAdvance = (field: "name" | "group" | "amount" | "memo") => (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (field === "memo" && event.shiftKey) {
      return;
    }

    event.preventDefault();

    const nextField = {
      amount: "memo",
      group: "amount",
      memo: "submit",
      name: "group",
    }[field] as VoiceStep | "memo" | "submit";

    moveToField(nextField);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--ink)]" htmlFor="entry-name">
          이름
        </label>
        <input
          className="focus-ring min-h-11 w-full rounded-[var(--radius-soft)] border bg-white px-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
          id="entry-name"
          onChange={(event) => updateField("name", event.target.value)}
          onFocus={() => {
            activeFieldRef.current = "name";
          }}
          onKeyDown={handleEnterAdvance("name")}
          placeholder="예: 김민지"
          ref={nameRef}
          value={values.name}
        />
        {duplicateName ? <p className="text-xs text-[var(--ink-faint)]">같은 이름의 기록이 이미 있어요. 중복 저장은 가능해요.</p> : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--ink)]" htmlFor="entry-group">
          그룹 · 선택
        </label>
        <input
          className="focus-ring min-h-11 w-full rounded-[var(--radius-soft)] border bg-white px-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
          id="entry-group"
          list="group-suggestions"
          onChange={(event) => updateField("group", event.target.value)}
          onFocus={() => {
            activeFieldRef.current = "group";
          }}
          onKeyDown={handleEnterAdvance("group")}
          placeholder="비워 두면 미분류로 표시돼요"
          ref={groupRef}
          value={values.group}
        />
        <datalist id="group-suggestions">
          {existingGroups.map((group) => (
            <option key={group} value={group} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--ink)]" htmlFor="entry-amount">
          금액
        </label>
        <input
          className="focus-ring min-h-11 w-full rounded-[var(--radius-soft)] border bg-white px-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
          id="entry-amount"
          inputMode="decimal"
          onBlur={() => {
            const parsed = parseAmountInput(values.amountText);
            if (parsed) {
              updateField("amountText", formatAmountField(parsed));
            }
          }}
          onChange={(event) => updateField("amountText", event.target.value)}
          onFocus={() => {
            activeFieldRef.current = "amount";
          }}
          onKeyDown={handleEnterAdvance("amount")}
          placeholder="예: 15만 / 150000 / 십오만"
          ref={amountRef}
          value={values.amountText}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {QUICK_AMOUNT_OPTIONS.map((option) => {
            const selected = parseAmountInput(values.amountText) === option.amount;

            return (
              <button
                className={`min-h-11 rounded-[var(--radius-soft)] border px-3 text-sm font-medium active:scale-95 ${
                  selected
                    ? "border-transparent bg-[var(--accent)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)]"
                }`}
                key={option.amount}
                onClick={() => updateField("amountText", option.label)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--ink)]" htmlFor="entry-memo">
          메모
        </label>
        <textarea
          className="focus-ring min-h-[112px] w-full rounded-[var(--radius-soft)] border bg-white px-3 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
          id="entry-memo"
          onChange={(event) => updateField("memo", event.target.value)}
          onFocus={() => {
            activeFieldRef.current = "memo";
          }}
          onKeyDown={handleEnterAdvance("memo")}
          placeholder="예: 신부 친구, 봉투 전달"
          ref={memoRef}
          rows={4}
          value={values.memo}
        />
      </div>

      <div className="rounded-[var(--radius-soft)] border border-[rgba(34,33,29,0.08)] bg-[rgba(255,255,255,0.52)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">음성 입력</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {voice.isSupported
                ? voice.statusText
                : "이 브라우저는 음성 입력을 지원하지 않아 수동 입력만 사용할 수 있어요."}
            </p>
          </div>
          <button
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] px-4 text-sm active:scale-95 ${
              voice.isSupported
                ? voice.isListening
                  ? "bg-[var(--accent)] font-semibold text-white"
                  : "border border-[var(--border)] bg-[var(--surface)] font-medium text-[var(--ink-soft)]"
                : "border border-[var(--border)] bg-[rgba(255,255,255,0.6)] font-medium text-[var(--ink-faint)]"
            }`}
            disabled={!voice.isSupported}
            onClick={() => {
              if (voice.isListening) {
                voice.stop();
                return;
              }

              voice.start(activeFieldRef.current && activeFieldRef.current !== "memo" ? activeFieldRef.current : undefined);
            }}
            type="button"
          >
            {voice.isSupported ? (voice.isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />) : <MicOff className="h-4 w-4" />}
            {voice.isListening ? "듣는 중" : "음성으로 이어서 입력"}
          </button>
        </div>
      </div>

      {formError ? <p className="text-sm font-medium text-[var(--ink)]">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-soft)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-medium text-[var(--ink)] active:scale-95"
          onClick={resetForm}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          초기화
        </button>
        <button className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-soft)] bg-[var(--accent)] px-4 text-sm font-semibold text-white active:scale-95" type="submit">
          저장하고 다음 기록
        </button>
      </div>
    </form>
  );
}
