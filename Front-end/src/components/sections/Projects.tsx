import { useMemo, useState } from "react";
import { useLang } from "../../lib/lang";
import { uniqueSorted } from "../../lib/format";
import { usePortfolio } from "../../lib/portfolio";
import { useReveal } from "../../lib/useReveal";
import { ProjectCard } from "../ProjectCard";
import { Section } from "../Section";

export function Projects() {
  const { data } = usePortfolio();
  const { t, lang } = useLang();
  // null = aucun filtre. On ne stocke pas le libellé « Tous » / « All » : il
  // change avec la langue, et le filtre ne correspondrait plus à rien.
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () => uniqueSorted(data.projects.flatMap((p) => p.tags), lang),
    [data.projects, lang],
  );
  const visible = useMemo(
    () => (tag === null ? data.projects : data.projects.filter((p) => p.tags.includes(tag))),
    [data.projects, tag],
  );

  // Les thèmes sont traduits : un filtre actif n'existe plus après bascule.
  if (tag !== null && !tags.includes(tag)) setTag(null);

  const gridRef = useReveal<HTMLUListElement>([visible]);

  return (
    <Section
      id="projects"
      index={t.projectsIndex}
      eyebrow={t.projectsEyebrow}
      title={t.projectsTitle}
      intro={t.projectsIntro}
    >
      <div role="group" aria-label={t.filterByTopic} className="flex flex-wrap gap-2">
        {[null, ...tags].map((tg) => (
          <button
            key={tg ?? "__all__"}
            type="button"
            onClick={() => setTag(tg)}
            aria-pressed={tag === tg}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tag === tg
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
            }`}
          >
            {tg ?? t.filterAll}
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {t.projectsShown}
      </p>

      <ul ref={gridRef} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <li
            key={p.slug}
            data-reveal
            style={{ "--i": i } as React.CSSProperties}
            className={p.featured ? "sm:col-span-2 lg:col-span-1" : ""}
          >
            <ProjectCard project={p} featured={p.featured} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
