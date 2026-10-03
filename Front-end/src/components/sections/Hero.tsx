import { ArrowRight, Download, Mail, MapPin, Trophy } from "lucide-react";
import { usePortfolio } from "../../lib/portfolio";
import { GithubIcon, LinkedinIcon } from "../icons";

export function Hero() {
  const { data } = usePortfolio();
  const { profile, certifications } = data;
  const award = certifications.find((c) => c.kind === "distinction");

  return (
    <section aria-labelledby="hero-title" className="container-page pt-12 sm:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          {profile.status_label && (
            <p className="rise inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              {profile.status_label}
            </p>
          )}

          <h1
            id="hero-title"
            className="rise rise-2 mt-6 text-[clamp(2.6rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-tight"
          >
            {profile.first_name}
            <br />
            <span className="text-brand">{profile.last_name}</span>
          </h1>

          <p className="rise rise-3 mt-5 font-mono text-sm text-muted sm:text-base">{profile.headline}</p>
          <p className="rise rise-3 mt-5 max-w-xl text-lg leading-relaxed text-ink/90">{profile.tagline}</p>

          <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
            <a href="#projets" className="btn btn-primary">
              Voir mes projets <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {profile.cv_url && (
              <a href={profile.cv_url} download className="btn btn-ghost">
                <Download className="h-4 w-4" aria-hidden="true" /> Télécharger le CV
              </a>
            )}
            <a href="#contact" className="btn btn-ghost">
              <Mail className="h-4 w-4" aria-hidden="true" /> Me contacter
            </a>
          </div>

          <ul className="rise rise-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            {profile.city && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {profile.city}
              </li>
            )}
            {profile.linkedin && (
              <li>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 hover:text-ink"
                >
                  <LinkedinIcon className="h-4 w-4" /> LinkedIn
                </a>
              </li>
            )}
            {profile.github && (
              <li>
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 hover:text-ink"
                >
                  <GithubIcon className="h-4 w-4" /> GitHub
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="rise rise-3 relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="dot-grid absolute -right-6 -top-6 h-40 w-40 rounded-3xl opacity-80" aria-hidden="true" />
          <div className="absolute -bottom-4 -left-4 h-full w-full rounded-[1.75rem] bg-brand-soft" aria-hidden="true" />
          <img
            src={profile.photo}
            alt={`Portrait de ${profile.first_name} ${profile.last_name}`}
            width={900}
            height={1094}
            fetchPriority="high"
            className="relative aspect-[4/5] w-full rounded-[1.75rem] border border-line object-cover object-[50%_30%] shadow-card"
          />
          {award && (
            <div className="card absolute -bottom-6 right-3 flex max-w-[16rem] items-center gap-3 px-4 py-3 sm:right-[-1.25rem]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Trophy className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm leading-snug">
                <span className="block font-semibold">{award.name}</span>
                <span className="text-muted">{award.date_label}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {profile.metrics.length > 0 && (
        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {profile.metrics.map((m) => (
            <div key={m.label} className="bg-surface px-5 py-6">
              <dt className="sr-only">{m.label}</dt>
              <dd>
                <span className="block font-mono text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
                  {m.value}
                </span>
                <span className="mt-2 block text-sm leading-snug text-muted">{m.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
