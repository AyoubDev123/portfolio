import { useGSAP } from "@gsap/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "../../lib/gsap";
import { useLang } from "../../lib/lang";
import { formatPeriod } from "../../lib/format";
import { usePortfolio } from "../../lib/portfolio";
import { LogoBadge } from "../LogoBadge";
import { Chip, Section } from "../Section";

export function Experience() {
  const { data } = usePortfolio();
  const { t } = useLang();
  const projectBySlug = new Map(data.projects.map((p) => [p.slug, p]));

  const trackRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const cards = trackRef.current?.querySelectorAll<HTMLElement>("li");
      if (!cards?.length) return;
      gsap.from(cards, {
        x: 48,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: trackRef.current,
          start: "top 82%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: trackRef },
  );

  const scroll = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("li");
    const amount = card ? card.offsetWidth + 24 : 360;
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <Section
      id="career"
      index={t.careerIndex}
      eyebrow={t.careerEyebrow}
      title={t.careerTitle}
      intro={t.careerIntro}
    >
      <div className="relative">
        {/* Navigation arrows */}
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={() => scroll("left")}
            aria-label="Précédent"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-brand hover:text-brand"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Suivant"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-brand hover:text-brand"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Horizontal track */}
        <ol
          ref={trackRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {data.experiences.map((exp) => (
            <li
              key={exp.id}
              className="snap-start shrink-0 w-[min(88vw,420px)]"
            >
              <article className="card flex h-full flex-col p-6 sm:p-7">
                {/* Header */}
                <header>
                  <div className="flex items-center gap-3">
                    <LogoBadge name={exp.company} size={44} />
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold tracking-tight">{exp.company}</h3>
                      <p className="truncate text-sm text-muted">{exp.role}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                    <Chip>{exp.contract}</Chip>
                    {exp.location && <span className="text-muted/70">{exp.location}</span>}
                    <time dateTime={exp.start_date} className="ml-auto">
                      {formatPeriod(exp.start_date, exp.end_date, exp.current)}
                    </time>
                  </div>
                  {exp.current && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand">
                      <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                      </span>
                      En poste
                    </span>
                  )}
                </header>

                {/* Body */}
                <div className="mt-4 flex flex-1 flex-col gap-4">
                  {exp.summary && <p className="text-[0.95rem] text-ink/90">{exp.summary}</p>}
                  {exp.highlights.length > 0 && (
                    <ul className="space-y-2 text-[0.9rem] text-muted">
                      {exp.highlights.map((h) => (
                        <li key={h} className="flex gap-3">
                          <span aria-hidden="true" className="mt-2 h-1 w-3 shrink-0 rounded-full bg-brand" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <footer className="mt-5 space-y-3">
                  {exp.stack.length > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                      {exp.stack.map((s) => (
                        <li key={s}><Chip>{s}</Chip></li>
                      ))}
                    </ul>
                  )}
                  {exp.project_slugs.length > 0 && (
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {exp.project_slugs.map((slug) => {
                        const p = projectBySlug.get(slug);
                        return p ? (
                          <Link
                            key={slug}
                            to={`/projects/${slug}`}
                            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                          >
                            {p.title} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : null;
                      })}
                    </p>
                  )}
                </footer>
              </article>
            </li>
          ))}
        </ol>

        {/* Fade edge hint */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-10 h-[calc(100%-2.5rem)] w-16 bg-gradient-to-l from-bg to-transparent"
        />
      </div>
    </Section>
  );
}
