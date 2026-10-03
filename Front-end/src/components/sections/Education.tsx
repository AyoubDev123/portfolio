import { useGSAP } from "@gsap/react";
import { Award, Trophy } from "lucide-react";
import { useRef } from "react";
import { gsap } from "../../lib/gsap";
import { usePortfolio } from "../../lib/portfolio";
import { InterestIcon } from "../icons";
import { Section } from "../Section";

export function Education() {
  const { data } = usePortfolio();
  const awards = data.certifications.filter((c) => c.kind === "distinction");
  const certs = data.certifications.filter((c) => c.kind === "certification");

  const eduRef = useRef<HTMLDivElement>(null);
  const interestRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const cards = eduRef.current?.querySelectorAll<HTMLElement>("li");
      if (!cards?.length) return;
      gsap.from(cards, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.09,
        scrollTrigger: {
          trigger: eduRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: eduRef },
  );

  useGSAP(
    () => {
      const cards = interestRef.current?.querySelectorAll<HTMLElement>("li");
      if (!cards?.length) return;
      gsap.from(cards, {
        y: 20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger: {
          trigger: interestRef.current,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: interestRef },
  );

  return (
    <>
      <Section
        id="formation"
        index="04"
        eyebrow="Formation"
        title="Formation et certifications"
        intro="Du bac scientifique au cycle ingénieur, avec des certifications ciblées en IA générative et en data."
      >
        <div ref={eduRef} className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <ol className="space-y-4">
            {data.education.map((e) => (
              <li key={e.id} className="card p-5 sm:p-6">
                <p className="font-mono text-xs text-muted">
                  {e.start_year} – {e.end_year}
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{e.school}</h3>
                <p className="text-muted">{e.degree}</p>
                {e.description && <p className="mt-3 text-[0.95rem] text-muted">{e.description}</p>}
              </li>
            ))}
          </ol>

          <div className="space-y-6">
            {awards.length > 0 && (
              <div>
                <h3 className="eyebrow">Reconnaissance</h3>
                <ul className="mt-3 space-y-3">
                  {awards.map((c) => (
                    <li key={c.id} className="card flex items-start gap-4 border-brand/40 p-5">
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
              <h3 className="eyebrow">Certifications</h3>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {certs.map((c) => (
                  <li key={c.id} className="flex items-start gap-4 px-5 py-4">
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
          id="interets"
          index="05"
          eyebrow="Au-delà du code"
          title="Centres d'intérêt"
          intro="Enquêtes, événements, tutorat, théâtre et jeux vidéo : ce que je fais en dehors des cours."
        >
          <ul ref={interestRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {data.interests.map((i) => (
              <li key={i.id} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <InterestIcon name={i.icon} />
                </span>
                <h3 className="mt-4 font-semibold leading-snug">{i.title}</h3>
                {i.description && <p className="mt-1 text-sm text-muted">{i.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
