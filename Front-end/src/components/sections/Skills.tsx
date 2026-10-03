import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import { useReveal } from "../../lib/useReveal";
import { Chip, Section } from "../Section";

export function Skills() {
  const { data } = usePortfolio();
  const { t } = useLang();
  const wrapperRef = useReveal<HTMLDivElement>();

  return (
    <Section
      id="skills"
      index={t.skillsIndex}
      eyebrow={t.skillsEyebrow}
      title={t.skillsTitle}
      intro={t.skillsIntro}
    >
      <div ref={wrapperRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.skill_groups.map((g, i) => (
          <section
            key={g.id}
            data-reveal
            style={{ "--i": i } as React.CSSProperties}
            aria-labelledby={`skill-${g.id}`}
            className="card p-5"
          >
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
