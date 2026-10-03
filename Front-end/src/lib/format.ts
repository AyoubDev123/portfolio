const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

/** « 2026-09-14 » → « sept. 2026 » */
export function formatMonth(iso: string): string {
  // On force midi UTC pour éviter tout décalage de fuseau sur la date seule.
  return monthYear.format(new Date(`${iso}T12:00:00Z`));
}

export function formatPeriod(startIso: string, endIso: string | null, current = false): string {
  const start = formatMonth(startIso);
  if (!endIso || current) return `${start} – aujourd'hui`;
  const end = formatMonth(endIso);
  return start === end ? start : `${start} – ${end}`;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr"));
}
