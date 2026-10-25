import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortfolio } from "../lib/portfolio";
import { useLang } from "../lib/lang";
import type { Project } from "../lib/types";
import { Chip } from "./Section";

interface Props {
  project: Project;
  featured?: boolean;
}

export function ProjectCard({ project, featured }: Props) {
  const { slug } = usePortfolio();
  const { t } = useLang();
  const cover = project.images[0];
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card-strong">
      <div
        className={`relative overflow-hidden border-b border-line bg-surface-2 ${featured ? "aspect-[21/9]" : "aspect-[16/9]"}`}
      >
        {cover ? (
          <img
            src={cover.src}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="dot-grid grid h-full w-full place-items-center p-6">
            <p className="text-center font-mono text-xs uppercase tracking-widest text-muted">
              {project.context || project.tags[0]}
            </p>
          </div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-on-brand">
            {t.featuredBadge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs text-muted">
          {project.period}
          {project.context ? ` · ${project.context}` : ""}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
          <Link to={`/${slug}/projects/${project.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {project.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-[0.95rem] text-muted">{project.summary}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t.technologies}>
          {project.stack.slice(0, 5).map((s) => (
            <li key={s}>
              <Chip>{s}</Chip>
            </li>
          ))}
          {project.stack.length > 5 && (
            <li>
              <Chip>+{project.stack.length - 5}</Chip>
            </li>
          )}
        </ul>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand" aria-hidden="true">
          {t.viewDetail} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </article>
  );
}
