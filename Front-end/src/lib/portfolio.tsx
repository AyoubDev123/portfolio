import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import staticData from "../data/portfolio.static.json";
import { fetchPortfolio } from "./api";
import type { Portfolio } from "./types";

export type DataSource = "static" | "snapshot" | "api";

interface PortfolioCtx {
  data: Portfolio;
  source: DataSource;
}

const Ctx = createContext<PortfolioCtx | null>(null);

/**
 * Ordre de priorité des sources de données :
 *   1. API live (données les plus fraîches)
 *   2. /snapshot.json (régénéré par le back-end après chaque mutation, servi par Nginx)
 *   3. Données statiques embarquées dans le bundle (dernier recours)
 *
 * L'UI s'affiche immédiatement avec les données statiques (aucun écran de chargement),
 * puis bascule silencieusement sur une source plus fraîche dès qu'elle est disponible.
 */
export function PortfolioProvider({ children, initial }: { children: ReactNode; initial?: Portfolio }) {
  const [state, setState] = useState<PortfolioCtx>({
    data: initial ?? (staticData as Portfolio),
    source: "static",
  });

  useEffect(() => {
    const ctrl = new AbortController();

    fetchPortfolio(ctrl.signal)
      .then((data) => setState({ data, source: "api" }))
      .catch(async () => {
        // L'API est injoignable : essaie le snapshot Nginx (volume Docker partagé).
        try {
          const res = await fetch("/snapshot.json", { signal: ctrl.signal });
          if (res.ok) {
            const data = (await res.json()) as Portfolio;
            setState({ data, source: "snapshot" });
          }
        } catch {
          /* repli silencieux sur les données statiques déjà affichées */
        }
      });

    return () => ctrl.abort();
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function usePortfolio(): PortfolioCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortfolio doit être utilisé dans <PortfolioProvider>");
  return ctx;
}
