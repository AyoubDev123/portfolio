import { usePortfolio } from "../../lib/portfolio";
import { Chip, Section } from "../Section";

export function Skills() {
  const { data } = usePortfolio();
  return (
    <Section
      id="competences"
      index="03"
      eyebrow="Compétences"
      title="La chaîne de valeur de la donnée"
      intro="De l'ingestion à la décision : data engineering, IA, BI et développement logiciel."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.skill_groups.map((g) => (
          <section key={g.id} aria-labelledby={`skill-${g.id}`} className="card p-5">
            <h3 id={`skill-${g.id}`} className="eyebrow !text-ink">
              {g.name}
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
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
          <h3 className="eyebrow">Langues</h3>
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
