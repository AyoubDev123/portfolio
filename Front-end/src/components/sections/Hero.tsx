import { useGSAP } from "@gsap/react";
import { ArrowRight, Download, Mail, MapPin } from "lucide-react";
import { useRef } from "react";
import { gsap } from "../../lib/gsap";
import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import type { Metric } from "../../lib/types";
import { GithubIcon, LinkedinIcon } from "../icons";

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^([\d.]+)(.*)$/);

  useGSAP(
    () => {
      if (!ref.current || !match) return;
      const num = parseFloat(match[1]);
      const suffix = match[2] ?? "";
      const isInt = Number.isInteger(num);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: num,
        duration: 1.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 95%",
          toggleActions: "play none none none",
        },
        onUpdate() {
          if (ref.current) {
            ref.current.textContent = (isInt ? Math.round(obj.val) : obj.val.toFixed(1)) + suffix;
          }
        },
      });
    },
    { scope: ref },
  );

  return <span ref={ref}>{value}</span>;
}

function MetricItem({ m }: { m: Metric }) {
  return (
    <div className="bg-surface px-5 py-6">
      <dt className="sr-only">{m.label}</dt>
      <dd>
        <span className="block font-mono text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
          <CountUp value={m.value} />
        </span>
        <span className="mt-2 block text-sm leading-snug text-muted">{m.label}</span>
      </dd>
    </div>
  );
}

export function Hero() {
  const { data } = usePortfolio();
  const { profile } = data;
  const { t } = useLang();

  const titleRef = useRef<HTMLHeadingElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const words = titleRef.current?.querySelectorAll<HTMLSpanElement>(".name-word");
      if (!words?.length) return;
      gsap.from(words, {
        y: "110%",
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.15,
      });
    },
    { scope: titleRef },
  );

  useGSAP(
    () => {
      if (!photoRef.current) return;
      gsap.from(photoRef.current, { y: 24, opacity: 0, duration: 1, ease: "power2.out", delay: 0.3 });
    },
    { scope: photoRef },
  );

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
            ref={titleRef}
            id="hero-title"
            className="mt-6 text-[clamp(2.6rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-tight"
          >
            <span className="block overflow-hidden">
              <span className="name-word block">{profile.first_name}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="name-word block text-brand">{profile.last_name}</span>
            </span>
          </h1>

          <p className="rise rise-3 mt-5 font-mono text-sm text-muted sm:text-base">{profile.headline}</p>
          <p className="rise rise-3 mt-5 max-w-xl text-lg leading-relaxed text-ink/90">{profile.tagline}</p>

          <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
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

          <ul className="rise rise-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
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

        <div ref={photoRef} className="relative mx-auto w-full max-w-sm lg:max-w-none">
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
        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {profile.metrics.map((m) => (
            <MetricItem key={m.label} m={m} />
          ))}
        </dl>
      )}
    </section>
  );
}
