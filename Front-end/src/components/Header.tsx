import { Download, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortfolio } from "../lib/portfolio";
import { useTheme } from "../lib/theme";

const LINKS = [
  { href: "#parcours", label: "Parcours" },
  { href: "#projets", label: "Projets" },
  { href: "#competences", label: "Compétences" },
  { href: "#formation", label: "Formation" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const { data } = usePortfolio();
  const { profile } = data;
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const base = pathname === "/" ? "" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Accueil">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-mono text-xs font-bold text-on-brand">
            AE
          </span>
          <span className="hidden sm:inline">
            {profile.first_name} {profile.last_name}
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={`${base}${l.href}`}
              className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {profile.cv_url && (
            <a href={profile.cv_url} download className="btn btn-ghost hidden !py-2 text-sm sm:inline-flex">
              <Download className="h-4 w-4" aria-hidden="true" /> CV
            </a>
          )}
          <button
            type="button"
            onClick={toggle}
            className="btn btn-ghost !p-2.5"
            aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="btn btn-ghost !p-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Navigation mobile" className="border-t border-line bg-bg md:hidden">
          <div className="container-page flex flex-col py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={`${base}${l.href}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base text-ink"
              >
                {l.label}
              </a>
            ))}
            {profile.cv_url && (
              <a href={profile.cv_url} download className="rounded-lg px-2 py-3 text-base font-semibold text-brand">
                Télécharger le CV
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
