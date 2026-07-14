const HANGUL_DIGITS: Record<string, number> = {
  공: 0,
  구: 9,
  륙: 6,
  사: 4,
  삼: 3,
  영: 0,
  오: 5,
  육: 6,
  이: 2,
  일: 1,
  칠: 7,
  팔: 8,
};

const SMALL_UNITS: Record<string, number> = {
  백: 100,
  십: 10,
  천: 1000,
};

const BIG_UNITS: Record<string, number> = {
  만: 10_000,
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function trimTrailingZero(value: string) {
  return value.replace(/\.0$/, "");
}

function parseHangulSection(section: string) {
  let total = 0;
  let currentDigit = 0;

  for (const char of section) {
    if (char in HANGUL_DIGITS) {
      currentDigit = HANGUL_DIGITS[char];
      continue;
    }

    if (char in SMALL_UNITS) {
      total += (currentDigit || 1) * SMALL_UNITS[char];
      currentDigit = 0;
    }
  }

  return total + currentDigit;
}

function parseMixedSection(section: string) {
  if (!section) {
    return 0;
  }

  if (/^\d+(?:\.\d+)?$/.test(section)) {
    return Number(section);
  }

  if (/^[공구륙사삼영오육이일칠팔구백십천]+$/.test(section)) {
    return parseHangulSection(section);
  }

  let remaining = section;
  let total = 0;

  for (const [unit, value] of Object.entries(SMALL_UNITS)) {
    remaining = remaining.replace(new RegExp(`(\\d+(?:\\.\\d+)?)${unit}`, "g"), (_, rawValue: string) => {
      total += Number(rawValue) * value;
      return "";
    });

    remaining = remaining.replace(new RegExp(`([공구륙사삼영오육이일칠팔구십백천]+)${unit}`, "g"), (_, rawValue: string) => {
      total += parseHangulSection(rawValue) * value;
      return "";
    });
  }

  if (/^\d+(?:\.\d+)?$/.test(remaining)) {
    total += Number(remaining);
  } else if (/^[공구륙사삼영오육이일칠팔구백십천]+$/.test(remaining)) {
    total += parseHangulSection(remaining);
  }

  return total;
}

export function parseAmountInput(input: string) {
  const normalized = input.replace(/원/g, "").replace(/[\s,]/g, "").trim();

  if (!normalized) {
    return 0;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  let remaining = normalized;
  let total = 0;

  for (const [unit, value] of Object.entries(BIG_UNITS)) {
    if (!remaining.includes(unit)) {
      continue;
    }

    const [front, back] = remaining.split(unit, 2);
    total += (front ? parseMixedSection(front) : 1) * value;
    remaining = back ?? "";
  }

  total += parseMixedSection(remaining);

  return Number.isFinite(total) ? Math.round(total) : 0;
}

export function formatAmountField(amount: number) {
  if (amount >= 10_000) {
    return `${trimTrailingZero((amount / 10_000).toFixed(amount % 10_000 === 0 ? 0 : 1))}만`;
  }

  return `${numberFormatter.format(amount)}`;
}

export function formatAmountCompact(amount: number) {
  if (amount <= 0) {
    return "0원";
  }

  if (amount >= 10_000) {
    return `${trimTrailingZero((amount / 10_000).toFixed(amount % 10_000 === 0 ? 0 : 1))}만 원`;
  }

  return `${numberFormatter.format(amount)}원`;
}
