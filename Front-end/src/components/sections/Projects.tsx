import { useGSAP } from "@gsap/react";
import { useMemo, useRef, useState } from "react";
import { gsap } from "../../lib/gsap";
import { useLang } from "../../lib/lang";
import { uniqueSorted } from "../../lib/format";
import { usePortfolio } from "../../lib/portfolio";
import { ProjectCard } from "../ProjectCard";
import { Section } from "../Section";

export function Projects() {
  const { data } = usePortfolio();
  const { t } = useLang();
  const [tag, setTag] = useState(t.filterAll);

  const tags = useMemo(() => [t.filterAll, ...uniqueSorted(data.projects.flatMap((p) => p.tags))], [data.projects, t.filterAll]);
  const visible = useMemo(
    () => (tag === t.filterAll ? data.projects : data.projects.filter((p) => p.tags.includes(tag))),
    [data.projects, tag, t.filterAll],
  );

  const gridRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const items = Array.from(gridRef.current?.children ?? []);
      if (!items.length) return;
      gsap.fromTo(
        items,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.38, stagger: 0.055, ease: "power2.out", clearProps: "transform,opacity" },
      );
    },
    { scope: gridRef, dependencies: [visible] },
  );

  return (
    <Section
      id="projects"
      index={t.projectsIndex}
      eyebrow={t.projectsEyebrow}
      title={t.projectsTitle}
      intro={t.projectsIntro}
    >
      <div role="group" aria-label="Filter projects by topic" className="flex flex-wrap gap-2">
        {tags.map((tg) => (
          <button
            key={tg}
            type="button"
            onClick={() => setTag(tg)}
            aria-pressed={tag === tg}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tag === tg
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
            }`}
          >
            {tg}
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} project{visible.length !== 1 ? "s" : ""} shown
      </p>

      <ul ref={gridRef} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <li key={p.slug} className={p.featured ? "sm:col-span-2 lg:col-span-1" : ""}>
            <ProjectCard project={p} featured={p.featured} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
