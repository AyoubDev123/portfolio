import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "../lib/types";
import { Chip } from "./Section";

export function ProjectCard({ project }: { project: Project }) {
  const cover = project.images[0];
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-surface-2">
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
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs text-muted">
          {project.featured && (
            <span className="mr-2 rounded-full bg-brand-soft px-2 py-0.5 font-semibold uppercase tracking-wider text-brand">
              À la une
            </span>
          )}
          {project.period}
          {project.context ? ` · ${project.context}` : ""}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
          {/* Le lien étendu couvre toute la carte (zone cliquable large, un seul lien pour les lecteurs d'écran). */}
          <Link to={`/projets/${project.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {project.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-[0.95rem] text-muted">{project.summary}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
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
          Voir le détail <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
