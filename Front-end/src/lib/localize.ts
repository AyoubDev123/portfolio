import type { Lang } from "./translations";
import type { I18n, Portfolio } from "./types";

/** Langue des colonnes elles-mêmes : rien à fusionner quand on l'affiche. */
export const BASE_LANG: Lang = "en";

/** Applique les traductions d'une entité par-dessus ses champs canoniques. */
function localizeRow<T extends { i18n?: I18n }>(row: T, lang: Lang): T {
  const overrides = row.i18n?.[lang];
  return overrides ? { ...row, ...overrides } : row;
}

export function localizePortfolio(data: Portfolio, lang: Lang): Portfolio {
  if (lang === BASE_LANG) return data;
  return {
    profile: localizeRow(data.profile, lang),
    experiences: data.experiences.map((r) => localizeRow(r, lang)),
    projects: data.projects.map((r) => localizeRow(r, lang)),
    skill_groups: data.skill_groups.map((r) => localizeRow(r, lang)),
    education: data.education.map((r) => localizeRow(r, lang)),
    certifications: data.certifications.map((r) => localizeRow(r, lang)),
    interests: data.interests.map((r) => localizeRow(r, lang)),
  };
}
