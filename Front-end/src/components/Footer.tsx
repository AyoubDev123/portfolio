import { Link } from "react-router-dom";
import { usePortfolio } from "../lib/portfolio";

export function Footer() {
  const { data, source } = usePortfolio();
  const { profile } = data;
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page flex flex-col gap-3 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.first_name} {profile.last_name}. Conçu et développé avec React et
          FastAPI.
        </p>
        <p className="flex items-center gap-4">
          <span className="font-mono text-xs" title="Origine des données affichées">
            données : {source === "api" ? "API" : "export statique"}
          </span>
          <Link to="/admin" className="underline-offset-4 hover:text-ink hover:underline">
            Espace admin
          </Link>
        </p>
      </div>
    </footer>
  );
}
