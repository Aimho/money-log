import type { EventMeta, SortMode, VoiceStep } from "@/lib/types";

export const STORAGE_KEY = "gift-entries-v1";

export const DEFAULT_EVENT_META: EventMeta = {
  date: "",
  name: "",
};

export const UNCATEGORIZED_GROUP_LABEL = "미분류";

export const QUICK_AMOUNT_OPTIONS = [
  { amount: 50_000, label: "5만" },
  { amount: 100_000, label: "10만" },
  { amount: 150_000, label: "15만" },
  { amount: 200_000, label: "20만" },
] as const;

export const GROUP_TONE_VARIABLES = [
  "var(--group-tone-1)",
  "var(--group-tone-2)",
  "var(--group-tone-3)",
  "var(--group-tone-4)",
  "var(--group-tone-5)",
  "var(--group-tone-6)",
  "var(--group-tone-7)",
  "var(--group-tone-8)",
] as const;

export const VOICE_STEP_ORDER: VoiceStep[] = ["name", "group", "amount"];

export const DEFAULT_SORT_MODE: SortMode = "latest";
