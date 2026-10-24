// Description déclarative des entités éditables : l'UI d'admin est générée à partir de ces schémas.

export type FieldType = "text" | "textarea" | "number" | "date" | "bool" | "lines" | "json" | "select";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export type Row = Record<string, unknown> & { id?: number };

export interface EntityDef {
  id: string;
  label: string;
  path: string;
  singleton?: boolean;
  fields: Field[];
  title: (row: Row) => string;
  subtitle?: (row: Row) => string;
  defaults: Row;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

export const ENTITIES: EntityDef[] = [
  {
    id: "profile",
    label: "Profil",
    path: "profile",
    singleton: true,
    title: (r) => `${s(r.first_name)} ${s(r.last_name)}`,
    defaults: { i18n: {} },
    fields: [
      { key: "first_name", label: "Prénom", type: "text", required: true },
      { key: "last_name", label: "Nom", type: "text", required: true },
      { key: "headline", label: "Titre", type: "text", required: true },
      { key: "tagline", label: "Accroche", type: "textarea", required: true },
      { key: "about", label: "À propos (un paragraphe par ligne)", type: "lines" },
      { key: "status_label", label: "Statut affiché (pastille du hero)", type: "text" },
      { key: "email", label: "E-mail", type: "text", required: true },
      { key: "city", label: "Localisation", type: "text" },
      { key: "linkedin", label: "URL LinkedIn", type: "text" },
      { key: "github", label: "URL GitHub", type: "text" },
      { key: "photo", label: "Chemin de la photo", type: "text" },
      { key: "cv_url", label: "Chemin du CV (PDF)", type: "text" },
      { key: "languages", label: "Langues (JSON : [{name, level}])", type: "json" },
      { key: "metrics", label: "Chiffres clés (JSON : [{value, label}])", type: "json" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "experiences",
    label: "Expériences",
    path: "experiences",
    title: (r) => s(r.company),
    subtitle: (r) => `${s(r.role)} · ${s(r.contract)}`,
    defaults: { i18n: {}, position: 0, highlights: [], stack: [] },
    fields: [
      { key: "slug", label: "Slug (a-z, 0-9, tirets)", type: "text", required: true },
      { key: "company", label: "Entreprise", type: "text", required: true },
      { key: "role", label: "Poste", type: "text", required: true },
      { key: "contract", label: "Contrat", type: "text", required: true },
      { key: "location", label: "Lieu", type: "text" },
      { key: "start_date", label: "Début", type: "date", required: true },
      { key: "end_date", label: "Fin (vide = en cours)", type: "date" },
      { key: "summary", label: "Résumé", type: "textarea" },
      { key: "highlights", label: "Réalisations (une par ligne)", type: "lines" },
      { key: "stack", label: "Technologies (une par ligne)", type: "lines" },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "projects",
    label: "Projets",
    path: "projects",
    title: (r) => s(r.title),
    subtitle: (r) => s(r.period),
    defaults: { i18n: {}, position: 0, featured: false, description: [], highlights: [], stack: [], tags: [], images: [], links: [] },
    fields: [
      { key: "slug", label: "Slug (a-z, 0-9, tirets)", type: "text", required: true },
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "subtitle", label: "Sous-titre", type: "text" },
      { key: "period", label: "Période", type: "text" },
      { key: "context", label: "Cadre (BUT, stage…)", type: "text" },
      { key: "summary", label: "Résumé (carte)", type: "textarea" },
      { key: "description", label: "Description (un paragraphe par ligne)", type: "lines" },
      { key: "highlights", label: "Points clés (un par ligne)", type: "lines" },
      { key: "stack", label: "Technologies (une par ligne)", type: "lines" },
      { key: "tags", label: "Thèmes / filtres (un par ligne)", type: "lines" },
      { key: "images", label: "Images (JSON : [{src, alt, caption}])", type: "json" },
      { key: "links", label: "Liens (JSON : [{label, url}])", type: "json" },
      { key: "experience_id", label: "Expérience liée", type: "select" },
      { key: "featured", label: "À la une", type: "bool" },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "skill-groups",
    label: "Compétences",
    path: "skill-groups",
    title: (r) => s(r.name),
    defaults: { i18n: {}, position: 0, items: [] },
    fields: [
      { key: "name", label: "Catégorie", type: "text", required: true },
      { key: "items", label: "Compétences (une par ligne)", type: "lines" },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "education",
    label: "Formations",
    path: "education",
    title: (r) => s(r.school),
    subtitle: (r) => s(r.degree),
    defaults: { i18n: {}, position: 0 },
    fields: [
      { key: "school", label: "Établissement", type: "text", required: true },
      { key: "degree", label: "Diplôme", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "start_year", label: "Année de début", type: "number", required: true },
      { key: "end_year", label: "Année de fin", type: "number", required: true },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "certifications",
    label: "Certifications",
    path: "certifications",
    title: (r) => s(r.name),
    subtitle: (r) => `${s(r.issuer)} · ${s(r.date_label)}`,
    defaults: { i18n: {}, position: 0, kind: "certification" },
    fields: [
      { key: "name", label: "Intitulé", type: "text", required: true },
      { key: "issuer", label: "Organisme", type: "text", required: true },
      { key: "date_label", label: "Date (texte libre)", type: "text", required: true },
      {
        key: "kind",
        label: "Type",
        type: "select",
        options: [
          { value: "certification", label: "Certification" },
          { value: "distinction", label: "Distinction / récompense" },
        ],
      },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
  {
    id: "interests",
    label: "Intérêts",
    path: "interests",
    title: (r) => s(r.title),
    defaults: { i18n: {}, position: 0, icon: "sparkles" },
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      {
        key: "icon",
        label: "Icône",
        type: "select",
        options: ["clipboard-list", "calendar-days", "graduation-cap", "drama", "gamepad-2", "briefcase", "sparkles"].map(
          (v) => ({ value: v, label: v }),
        ),
      },
      { key: "position", label: "Ordre", type: "number" },
      { key: "i18n", label: "Traductions (JSON : {\"fr\": {\"champ\": \"valeur\"}})", type: "json" },
    ],
  },
];
