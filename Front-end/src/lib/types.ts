import type { Lang } from "./translations";

// Miroir des schémas Pydantic du back-end (Back-end/app/schemas.py).

/** Traductions d'une entité : les champs des interfaces ci-dessous portent
 *  l'anglais (langue canonique), i18n.fr ne contient que les champs traduits. */
export type I18n = Partial<Record<Lang, Record<string, unknown>>>;

export interface LanguageLevel {
  name: string;
  level: string;
}
export interface Metric {
  value: string;
  label: string;
}
export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
}
export interface LinkItem {
  label: string;
  url: string;
}

export interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  headline: string;
  tagline: string;
  about: string[];
  status_label: string;
  email: string;
  city: string;
  linkedin: string;
  github: string;
  photo: string;
  cv_url: string;
  languages: LanguageLevel[];
  metrics: Metric[];
  i18n: I18n;
}

export interface Experience {
  id: number;
  slug: string;
  company: string;
  role: string;
  contract: string;
  location: string;
  start_date: string; // ISO
  end_date: string | null;
  summary: string;
  highlights: string[];
  stack: string[];
  position: number;
  current: boolean;
  project_slugs: string[];
  i18n: I18n;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  period: string;
  context: string;
  summary: string;
  description: string[];
  highlights: string[];
  stack: string[];
  tags: string[];
  images: ProjectImage[];
  links: LinkItem[];
  featured: boolean;
  position: number;
  experience_id: number | null;
  experience_slug: string | null;
  i18n: I18n;
}

export interface SkillGroup {
  id: number;
  name: string;
  items: string[];
  position: number;
  i18n: I18n;
}
export interface Education {
  id: number;
  school: string;
  degree: string;
  description: string;
  start_year: number;
  end_year: number;
  position: number;
  i18n: I18n;
}
export interface Certification {
  id: number;
  name: string;
  issuer: string;
  date_label: string;
  kind: "certification" | "distinction";
  position: number;
  i18n: I18n;
}
export interface Interest {
  id: number;
  title: string;
  description: string;
  icon: string;
  position: number;
  i18n: I18n;
}

export interface Portfolio {
  profile: Profile;
  experiences: Experience[];
  projects: Project[];
  skill_groups: SkillGroup[];
  education: Education[];
  certifications: Certification[];
  interests: Interest[];
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // honeypot
}
