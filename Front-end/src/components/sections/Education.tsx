import { Award, Trophy } from "lucide-react";
import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import { useReveal } from "../../lib/useReveal";
import { InterestIcon } from "../icons";
import { LogoBadge } from "../LogoBadge";
import { Section } from "../Section";

export function Education() {
  const { data } = usePortfolio();
  const { t } = useLang();
  const awards = data.certifications.filter((c) => c.kind === "distinction");
  const certs = data.certifications.filter((c) => c.kind === "certification");

  const eduRef = useReveal<HTMLDivElement>();
  const interestRef = useReveal<HTMLUListElement>();

  return (
    <>
      <Section
        id="education"
        index={t.educationIndex}
        eyebrow={t.educationEyebrow}
        title={t.educationTitle}
        intro={t.educationIntro}
      >
        <div ref={eduRef} className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <ol className="space-y-4">
            {data.education.map((e, i) => (
              <li
                key={e.id}
                data-reveal
                style={{ "--i": i } as React.CSSProperties}
                className="card p-5 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <LogoBadge name={e.school} />
                  <div>
                    <p className="font-mono text-xs text-muted">{e.start_year} – {e.end_year}</p>
                    <h3 className="text-lg font-semibold tracking-tight leading-snug">{e.school}</h3>
                  </div>
                </div>
                <p className="mt-2 text-muted">{e.degree}</p>
                {e.description && (
                  <ul className="mt-3 space-y-1.5 text-[0.9rem] text-muted">
                    {e.description.split("\n").map((line) => (
                      <li key={line} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-2 h-1 w-2.5 shrink-0 rounded-full bg-brand" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <div className="space-y-6">
            {awards.length > 0 && (
              <div>
                <h3 className="eyebrow">{t.recognitionLabel}</h3>
                <ul className="mt-3 space-y-3">
                  {awards.map((c, i) => (
                    <li
                      key={c.id}
                      data-reveal
                      style={{ "--i": i } as React.CSSProperties}
                      className="card flex items-start gap-4 border-brand/40 p-5"
                    >
                      <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-warm" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-sm text-muted">
                          {c.issuer} · {c.date_label}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="eyebrow">{t.certificationsLabel}</h3>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {certs.map((c, i) => (
                  <li
                    key={c.id}
                    data-reveal
                    style={{ "--i": i } as React.CSSProperties}
                    className="flex items-start gap-4 px-5 py-4"
                  >
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{c.name}</p>
                      <p className="text-sm text-muted">
                        {c.issuer} · {c.date_label}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {data.interests.length > 0 && (
        <Section
          id="interests"
          index={t.interestsIndex}
          eyebrow={t.interestsEyebrow}
          title={t.interestsTitle}
          intro={t.interestsIntro}
        >
          <ul ref={interestRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {data.interests.map((item, i) => (
              <li
                key={item.id}
                data-reveal
                style={{ "--i": i } as React.CSSProperties}
                className="card p-5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <InterestIcon name={item.icon} />
                </span>
                <h3 className="mt-4 font-semibold leading-snug">{item.title}</h3>
                {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
