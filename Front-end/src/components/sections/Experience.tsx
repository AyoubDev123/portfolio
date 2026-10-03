import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPeriod } from "../../lib/format";
import { usePortfolio } from "../../lib/portfolio";
import { Chip, Section } from "../Section";

export function Experience() {
  const { data } = usePortfolio();
  const projectBySlug = new Map(data.projects.map((p) => [p.slug, p]));

  return (
    <Section
      id="parcours"
      index="01"
      eyebrow="Parcours"
      title="Expériences professionnelles"
      intro="Une alternance en cours et deux stages sur des sujets d'IA générative et de recherche sémantique."
    >
      <ol className="relative space-y-8 border-l border-line pl-6 sm:pl-8">
        {data.experiences.map((exp) => (
          <li key={exp.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[calc(1.5rem+5px)] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-bg sm:-left-[calc(2rem+5px)] ${
                exp.current ? "bg-brand" : "bg-line"
              }`}
            />
            <article className="card p-6 sm:p-7">
              <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{exp.company}</h3>
                  <p className="text-muted">{exp.role}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                  <Chip>{exp.contract}</Chip>
                  <time dateTime={exp.start_date}>{formatPeriod(exp.start_date, exp.end_date, exp.current)}</time>
                </div>
              </header>

              {exp.summary && <p className="mt-4 text-ink/90">{exp.summary}</p>}

              {exp.highlights.length > 0 && (
                <ul className="mt-4 space-y-2 text-[0.95rem] text-muted">
                  {exp.highlights.map((h) => (
                    <li key={h} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-1 w-3 shrink-0 rounded-full bg-brand" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              {exp.stack.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies utilisées">
                  {exp.stack.map((s) => (
                    <li key={s}>
                      <Chip>{s}</Chip>
                    </li>
                  ))}
                </ul>
              )}

              {exp.project_slugs.length > 0 && (
                <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {exp.project_slugs.map((slug) => {
                    const p = projectBySlug.get(slug);
                    return p ? (
                      <Link
                        key={slug}
                        to={`/projets/${slug}`}
                        className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                      >
                        {p.title} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : null;
                  })}
                </p>
              )}
            </article>
          </li>
        ))}
      </ol>
    </Section>
  );
}
