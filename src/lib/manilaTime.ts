/**
 * Returns the current and previous Garden Cycle keys (`YYYY-MM-DD`) in `Asia/Manila`
 * where each daily cycle resets at 6:00 PM PHT (18:00).
 */
export function getManilaCycleDates(nowMs: number = Date.now()): {
  today: string;
  yesterday: string;
} {
  const shiftedNow = new Date(nowMs - 18 * 60 * 60 * 1000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(shiftedNow);

  const [y, m, d] = today.split("-").map(Number);
  const yesterdayUtc = new Date(Date.UTC(y, m - 1, d - 1));
  const yesterday = yesterdayUtc.toISOString().slice(0, 10);

  return { today, yesterday };
}
