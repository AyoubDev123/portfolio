import { Link } from "react-router-dom";
import { useLang } from "../lib/lang";
import { usePortfolio } from "../lib/portfolio";

export function Footer() {
  const { data, source } = usePortfolio();
  const { profile } = data;
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.first_name} {profile.last_name}. {t.footerBuilt}
        </p>
        <p className="flex items-center gap-4">
          <span className="font-mono text-xs" title="Data source">
            {t.footerDataLabel}: {source === "api" ? t.footerApiSrc : t.footerStaticSrc}
          </span>
          <Link to="/admin" className="underline-offset-4 hover:text-ink hover:underline">
            {t.adminLink}
          </Link>
        </p>
      </div>
    </footer>
  );
}
