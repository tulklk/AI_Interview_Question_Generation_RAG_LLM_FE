// Local calendar-day key (not UTC) — completedAt is stored in UTC, but a
// "streak" should follow the candidate's own local day boundary, not UTC's.
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive-day practice streak (today or yesterday counts as the anchor) from a list of completedAt timestamps. */
export function computeStreakDays(completedAtList: (string | undefined)[]): number {
  const days = new Set(
    completedAtList
      .map((iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : localDateKey(d);
      })
      .filter((d): d is string => d !== null)
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
