import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Chip } from "../components/Section";
import { useLang } from "../lib/lang";
import { usePortfolio } from "../lib/portfolio";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import NotFound from "./NotFound";

export default function ProjectPage() {
  const { slug } = useParams();
  const { data } = usePortfolio();
  const { t } = useLang();
  const project = data.projects.find((p) => p.slug === slug);
  const [zoom, setZoom] = useState<number | null>(null);

  useDocumentTitle(project ? `${project.title} · Ayoub EL ABBASSI` : t.projectNotFound);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setZoom(null);
  }, [slug]);

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (!project) return <NotFound />;

  const experience = data.experiences.find((e) => e.slug === project.experience_slug);
  const index = data.projects.findIndex((p) => p.slug === project.slug);
  const next = data.projects[(index + 1) % data.projects.length];
  const active = zoom !== null ? project.images[zoom] : null;

  return (
    <article className="container-page pt-10 sm:pt-14">
      <Link to="/#projects" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t.allProjects}
      </Link>

      <header className="mt-6 max-w-3xl">
        <p className="eyebrow">
          {project.period}
          {project.context ? ` · ${project.context}` : ""}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{project.title}</h1>
        {project.subtitle && <p className="mt-4 text-xl text-muted">{project.subtitle}</p>}
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.topicsLabel}>
          {project.tags.map((tag) => (
            <li key={tag}>
              <span className="chip !bg-brand-soft !text-brand">{tag}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <div className="space-y-4 text-lg leading-relaxed text-ink/90">
            {project.description.map((para) => (
              <p key={para}>{para}</p>
            ))}
          </div>

          {project.images.length > 0 && (
            <section aria-labelledby="gallery-title" className="mt-12">
              <h2 id="gallery-title" className="eyebrow">
                {t.galleryLabel}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {project.images.map((img, i) => (
                  <li key={img.src} className={project.images.length % 2 === 1 && i === 0 ? "sm:col-span-2" : ""}>
                    <figure className="card overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setZoom(i)}
                        className="block w-full bg-surface-2"
                        aria-label={`Zoom: ${img.caption || img.alt}`}
                      >
                        <img src={img.src} alt={img.alt} loading="lazy" className="w-full object-contain" />
                      </button>
                      {img.caption && (
                        <figcaption className="border-t border-line px-4 py-3 text-sm text-muted">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" aria-label={t.keyPointsLabel}>
          {project.highlights.length > 0 && (
            <section className="card p-5">
              <h2 className="eyebrow">{t.keyPointsLabel}</h2>
              <ul className="mt-3 space-y-2.5 text-[0.95rem]">
                {project.highlights.map((h) => (
                  <li key={h} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 h-1 w-3 shrink-0 rounded-full bg-brand" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card p-5">
            <h2 className="eyebrow">{t.techSideLabel}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <li key={s}>
                  <Chip>{s}</Chip>
                </li>
              ))}
            </ul>
          </section>
          {experience && (
            <section className="card p-5">
              <h2 className="eyebrow">{t.contextSideLabel}</h2>
              <p className="mt-3 font-semibold">{experience.company}</p>
              <p className="text-sm text-muted">
                {experience.role} · {experience.contract}
              </p>
            </section>
          )}
          {project.links.length > 0 && (
            <ul className="space-y-2">
              {project.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-ghost w-full justify-between"
                  >
                    {l.label} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {next && next.slug !== project.slug && (
        <nav aria-label={t.nextProjectLabel} className="mt-16 border-t border-line pt-8">
          <Link to={`/projects/${next.slug}`} className="group flex items-center justify-between gap-6">
            <span>
              <span className="eyebrow">{t.nextProjectLabel}</span>
              <span className="mt-1 block text-xl font-semibold tracking-tight group-hover:text-brand">
                {next.title}
              </span>
            </span>
            <ArrowRight className="h-6 w-6 shrink-0 text-brand transition-transform group-hover:translate-x-1" />
          </Link>
        </nav>
      )}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || active.alt}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <button
            type="button"
            className="btn btn-ghost absolute right-4 top-4"
            onClick={() => setZoom(null)}
            autoFocus
          >
            {t.closeBtn}
          </button>
          <img
            src={active.src}
            alt={active.alt}
            className="max-h-[88vh] max-w-full rounded-lg bg-surface object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}
