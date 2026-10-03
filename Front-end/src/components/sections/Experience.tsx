import { useGSAP } from "@gsap/react";
import { ArrowUpRight } from "lucide-react";
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

  const wrapperRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrapper = wrapperRef.current;
      const line = lineRef.current;
      if (!wrapper || !line) return;

      gsap.set(line, { scaleY: 0, transformOrigin: "top" });
      gsap.to(line, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: wrapper, start: "top 75%", end: "bottom 35%", scrub: 0.6 },
      });

      const cards = wrapper.querySelectorAll<HTMLElement>("article");
      gsap.from(cards, {
        x: -28,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.14,
        scrollTrigger: { trigger: wrapper, start: "top 82%", toggleActions: "play none none none" },
      });
    },
    { scope: wrapperRef },
  );

  return (
    <Section
      id="career"
      index={t.careerIndex}
      eyebrow={t.careerEyebrow}
      title={t.careerTitle}
      intro={t.careerIntro}
    >
      <div ref={wrapperRef} className="relative">
        <div ref={lineRef} aria-hidden="true" className="absolute left-0 top-0 h-full w-px bg-line" />
        <ol className="relative space-y-8 pl-6 sm:pl-8">
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
                  <div className="flex items-center gap-3">
                    <LogoBadge name={exp.company} />
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{exp.company}</h3>
                      <p className="text-muted">{exp.role}</p>
                    </div>
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
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
                    {exp.stack.map((s) => (
                      <li key={s}><Chip>{s}</Chip></li>
                    ))}
                  </ul>
                )}
                {exp.project_slugs.length > 0 && (
                  <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {exp.project_slugs.map((slug) => {
                      const p = projectBySlug.get(slug);
                      return p ? (
                        <Link key={slug} to={`/projects/${slug}`} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
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
      </div>
    </Section>
  );
}
