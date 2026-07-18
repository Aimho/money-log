import { parseAmountInput } from "@/lib/amount";

export type VoiceEntryCandidate = {
  amount: number;
  group: string;
  name: string;
  score: number;
};

export type VoiceEntryParseResult = {
  candidates: VoiceEntryCandidate[];
  isAmbiguous: boolean;
};

const GROUP_HINTS = ["가족", "친구", "동료", "직장", "회사", "학교", "대학", "친척", "지인", "모임", "팀"];

function normalize(value: string) {
  return value.replace(/\s+/g, "").toLocaleLowerCase("ko");
}

function splitAmount(transcript: string) {
  const words = transcript.trim().replace(/[,.!?]/g, " ").split(/\s+/).filter(Boolean);
  let best: { amount: number; end: number; start: number } | null = null;

  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= words.length; end += 1) {
      const amountText = words.slice(start, end).join("");
      if (!/^[\d공영일이삼사오육륙칠팔구십백천만원]+$/.test(amountText)) continue;
      if (!/[\d십백천만원]/.test(amountText)) continue;
      const amount = parseAmountInput(amountText);
      if (amount > 0 && (!best || end - start > best.end - best.start)) best = { amount, end, start };
    }
  }

  if (!best) return { amount: 0, words };
  return { amount: best.amount, words: [...words.slice(0, best.start), ...words.slice(best.end)] };
}

function scoreName(name: string) {
  const compact = normalize(name);
  if (/^[가-힣]{2,4}$/.test(compact)) return 28;
  if (/^[가-힣]{2,6}$/.test(compact)) return 18;
  return name ? 4 : -100;
}

export function parseVoiceEntry(transcript: string, existingGroups: string[]): VoiceEntryParseResult {
  const { amount, words } = splitAmount(transcript);
  if (!amount || words.length === 0) return { candidates: [], isAmbiguous: false };

  const knownGroups = new Map(existingGroups.map((group, index) => [normalize(group), Math.max(8 - index, 1)]));
  const candidates: VoiceEntryCandidate[] = [];
  const addCandidate = (name: string, group: string) => {
    const normalizedGroup = normalize(group);
    let score = scoreName(name);
    if (group) {
      score += knownGroups.has(normalizedGroup) ? 45 + (knownGroups.get(normalizedGroup) ?? 0) : 8;
      if (GROUP_HINTS.some((hint) => normalizedGroup.includes(hint))) score += 10;
    } else {
      score += words.length === 1 ? 20 : -4;
    }
    candidates.push({ amount, group: group.trim(), name: name.trim(), score });
  };

  addCandidate(words.join(" "), "");
  for (let index = 1; index < words.length; index += 1) {
    addCandidate(words.slice(0, index).join(" "), words.slice(index).join(" "));
  }

  const unique = [...new Map(candidates.map((candidate) => [`${candidate.name}|${candidate.group}`, candidate])).values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  const gap = unique.length > 1 ? unique[0].score - unique[1].score : Number.POSITIVE_INFINITY;

  return { candidates: unique, isAmbiguous: gap < 15 };
}
