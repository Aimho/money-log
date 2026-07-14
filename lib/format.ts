const relativeFormatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

export function formatRelativeTime(dateLike: string) {
  const target = new Date(dateLike).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 1) {
    return "방금 전";
  }

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeFormatter.format(diffDays, "day");
}
