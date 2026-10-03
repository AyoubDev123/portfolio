import { useGSAP } from "@gsap/react";
import { Download, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "../lib/gsap";
import { useLang } from "../lib/lang";
import { usePortfolio } from "../lib/portfolio";
import { useTheme } from "../lib/theme";

const SECTION_IDS = ["career", "projects", "skills", "education", "contact"];

export function Header() {
  const { theme, toggle } = useTheme();
  const { data } = usePortfolio();
  const { profile } = data;
  const { t, toggle: toggleLang } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { pathname } = useLocation();
  const base = pathname === "/" ? "" : "/";

  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!progressRef.current) return;
    gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left" });
    gsap.to(progressRef.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2,
      },
    });
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const NAV = [
    { id: "career", label: t.navCareer },
    { id: "projects", label: t.navProjects },
    { id: "skills", label: t.navSkills },
    { id: "education", label: t.navEducation },
    { id: "contact", label: t.navContact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label={t.skipToContent}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-mono text-xs font-bold text-on-brand">
            AE
          </span>
          <span className="hidden sm:inline">
            {profile.first_name} {profile.last_name}
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {NAV.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.id}
                href={`${base}#${l.id}`}
                className={`relative rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? "font-medium text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
                {isActive && (
                  <span className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-brand" aria-hidden="true" />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {profile.cv_url && (
            <a href={profile.cv_url} download className="btn btn-ghost hidden !py-2 text-sm sm:inline-flex">
              <Download className="h-4 w-4" aria-hidden="true" /> {t.downloadCV}
            </a>
          )}
          <button
            type="button"
            onClick={toggleLang}
            className="btn btn-ghost !px-3 !py-2 font-mono text-xs font-semibold"
            aria-label={`Switch language to ${t.langToggle}`}
          >
            {t.langToggle}
          </button>
          <button
            type="button"
            onClick={toggle}
            className="btn btn-ghost !p-2.5"
            aria-label={theme === "dark" ? t.lightTheme : t.darkTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="btn btn-ghost !p-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.closeMenu : t.openMenu}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        ref={progressRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full origin-left bg-brand"
        style={{ transform: "scaleX(0)" }}
      />

      {open && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="border-t border-line bg-bg md:hidden">
          <div className="container-page flex flex-col py-2">
            {NAV.map((l) => (
              <a
                key={l.id}
                href={`${base}#${l.id}`}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-2 py-3 text-base ${active === l.id ? "font-semibold text-brand" : "text-ink"}`}
              >
                {l.label}
              </a>
            ))}
            {profile.cv_url && (
              <a href={profile.cv_url} download className="rounded-lg px-2 py-3 text-base font-semibold text-brand">
                {t.downloadCVFull}
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
