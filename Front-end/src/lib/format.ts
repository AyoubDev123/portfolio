import type { Lang } from "./translations";

const LOCALES: Record<Lang, string> = { en: "en-GB", fr: "fr-FR" };
const TODAY: Record<Lang, string> = { en: "present", fr: "aujourd'hui" };

const formatters: Partial<Record<Lang, Intl.DateTimeFormat>> = {};

function monthYear(lang: Lang): Intl.DateTimeFormat {
  return (formatters[lang] ??= new Intl.DateTimeFormat(LOCALES[lang], { month: "short", year: "numeric" }));
}

/** « 2026-09-14 » → « sept. 2026 » (fr) / « Sep 2026 » (en) */
export function formatMonth(iso: string, lang: Lang): string {
  // On force midi UTC pour éviter tout décalage de fuseau sur la date seule.
  return monthYear(lang).format(new Date(`${iso}T12:00:00Z`));
}

export function formatPeriod(startIso: string, endIso: string | null, current: boolean, lang: Lang): string {
  const start = formatMonth(startIso, lang);
  if (!endIso || current) return `${start} – ${TODAY[lang]}`;
  const end = formatMonth(endIso, lang);
  return start === end ? start : `${start} – ${end}`;
}

export function uniqueSorted(values: string[], lang: Lang): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, LOCALES[lang]));
}
