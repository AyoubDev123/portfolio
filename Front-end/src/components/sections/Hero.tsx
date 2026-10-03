import { ArrowRight, Download, Mail, MapPin } from "lucide-react";
import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import { useReveal } from "../../lib/useReveal";
import type { Metric } from "../../lib/types";
import { GithubIcon, LinkedinIcon } from "../icons";

function MetricItem({ m, i }: { m: Metric; i: number }) {
  const isNumeric = /\d/.test(m.value);
  return (
    <div
      data-reveal
      style={{ "--i": i } as React.CSSProperties}
      className="bg-surface px-5 py-5 flex flex-col justify-center"
    >
      <dt className="sr-only">{m.label || m.value}</dt>
      <dd>
        {isNumeric ? (
          <span className="block font-mono text-3xl font-semibold tracking-tight text-brand sm:text-4xl">{m.value}</span>
        ) : (
          <span className="block text-base font-semibold tracking-tight text-brand">{m.value}</span>
        )}
        {m.label && <span className="mt-1.5 block text-sm leading-snug text-muted">{m.label}</span>}
      </dd>
    </div>
  );
}

export function Hero() {
  const { data } = usePortfolio();
  const { profile } = data;
  const { t } = useLang();
  const sectionRef = useReveal<HTMLElement>();

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="container-page pt-12 sm:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          {profile.status_label && (
            <p
              data-reveal
              style={{ "--i": 0 } as React.CSSProperties}
              className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              {profile.status_label}
            </p>
          )}

          <h1
            id="hero-title"
            className="mt-6 text-[clamp(2.6rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-tight"
          >
            <span className="block overflow-hidden">
              <span className="name-word" style={{ "--name-delay": "0.1s" } as React.CSSProperties}>
                {profile.first_name}
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="name-word text-brand" style={{ "--name-delay": "0.22s" } as React.CSSProperties}>
                {profile.last_name}
              </span>
            </span>
          </h1>

          <p
            data-reveal
            style={{ "--i": 1 } as React.CSSProperties}
            className="mt-5 font-mono text-sm text-muted sm:text-base"
          >
            {profile.headline}
          </p>
          <p
            data-reveal
            style={{ "--i": 2 } as React.CSSProperties}
            className="mt-5 max-w-xl text-lg leading-relaxed text-ink/90"
          >
            {profile.tagline}
          </p>

          <div
            data-reveal
            style={{ "--i": 3 } as React.CSSProperties}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a href="#projects" className="btn btn-primary">
              {t.viewProjects} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {profile.cv_url && (
              <a href={profile.cv_url} download className="btn btn-ghost">
                <Download className="h-4 w-4" aria-hidden="true" /> {t.downloadCVFull}
              </a>
            )}
            <a href="#contact" className="btn btn-ghost">
              <Mail className="h-4 w-4" aria-hidden="true" /> {t.contactMe}
            </a>
          </div>

          <ul
            data-reveal
            style={{ "--i": 4 } as React.CSSProperties}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted"
          >
            {profile.city && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {profile.city}
              </li>
            )}
            {profile.linkedin && (
              <li>
                <a href={profile.linkedin} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 hover:text-ink">
                  <LinkedinIcon className="h-4 w-4" /> LinkedIn
                </a>
              </li>
            )}
            {profile.github && (
              <li>
                <a href={profile.github} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 hover:text-ink">
                  <GithubIcon className="h-4 w-4" /> GitHub
                </a>
              </li>
            )}
          </ul>
        </div>

        <div
          data-reveal
          style={{ "--i": 2 } as React.CSSProperties}
          className="relative mx-auto w-full max-w-sm lg:max-w-none"
        >
          <div className="dot-grid absolute -right-6 -top-6 h-40 w-40 rounded-3xl opacity-80" aria-hidden="true" />
          <div className="absolute -bottom-4 -left-4 h-full w-full rounded-[1.75rem] bg-brand-soft" aria-hidden="true" />
          <img
            src={profile.photo}
            alt={`${profile.first_name} ${profile.last_name}`}
            width={900}
            height={1094}
            fetchPriority="high"
            className="relative aspect-[4/5] w-full rounded-[1.75rem] border border-line object-cover object-[50%_30%] shadow-card"
          />
        </div>
      </div>

      {profile.metrics.length > 0 && (
        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {profile.metrics.map((m, i) => (
            <MetricItem key={m.label || m.value} m={m} i={i} />
          ))}
        </dl>
      )}
    </section>
  );
}
