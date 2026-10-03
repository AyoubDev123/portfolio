import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { gsap } from "../../lib/gsap";
import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import { Chip, Section } from "../Section";

export function Skills() {
  const { data } = usePortfolio();
  const { t } = useLang();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = wrapperRef.current?.querySelectorAll<HTMLElement>(".skill-card");
      if (!cards?.length) return;
      gsap.from(cards, {
        y: 24,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: wrapperRef },
  );

  return (
    <Section
      id="skills"
      index={t.skillsIndex}
      eyebrow={t.skillsEyebrow}
      title={t.skillsTitle}
      intro={t.skillsIntro}
    >
      <div ref={wrapperRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.skill_groups.map((g) => (
          <section key={g.id} aria-labelledby={`skill-${g.id}`} className="skill-card card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-4 w-0.5 rounded-full bg-brand" aria-hidden="true" />
              <h3 id={`skill-${g.id}`} className="eyebrow !text-ink">
                {g.name}
              </h3>
            </div>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((item) => (
                <li key={item}>
                  <Chip>{item}</Chip>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {data.profile.languages.length > 0 && (
        <div className="mt-8">
          <h3 className="eyebrow">{t.languagesLabel}</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {data.profile.languages.map((l) => (
              <li key={l.name} className="card flex items-baseline justify-between px-5 py-4">
                <span className="font-semibold">{l.name}</span>
                <span className="text-sm text-muted">{l.level}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
