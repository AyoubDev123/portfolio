import { useMemo, useState } from "react";
import { uniqueSorted } from "../../lib/format";
import { usePortfolio } from "../../lib/portfolio";
import { ProjectCard } from "../ProjectCard";
import { Section } from "../Section";

const ALL = "Tous";

export function Projects() {
  const { data } = usePortfolio();
  const [tag, setTag] = useState(ALL);

  const tags = useMemo(() => [ALL, ...uniqueSorted(data.projects.flatMap((p) => p.tags))], [data.projects]);
  const visible = useMemo(
    () => (tag === ALL ? data.projects : data.projects.filter((p) => p.tags.includes(tag))),
    [data.projects, tag],
  );

  return (
    <Section
      id="projets"
      index="02"
      eyebrow="Projets"
      title="Ce que j'ai construit"
      intro="Projets académiques et professionnels, du data engineering à la restitution, en passant par les LLM."
    >
      <div role="group" aria-label="Filtrer les projets par thème" className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            aria-pressed={tag === t}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tag === t
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} projet{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <li key={p.slug}>
            <ProjectCard project={p} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
