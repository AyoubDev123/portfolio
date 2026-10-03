import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import staticData from "../data/portfolio.static.json";
import { fetchPortfolio } from "./api";
import type { Portfolio } from "./types";

export type DataSource = "static" | "api";

interface PortfolioCtx {
  data: Portfolio;
  source: DataSource;
}

const Ctx = createContext<PortfolioCtx | null>(null);

/**
 * Le site s'affiche immédiatement avec l'export statique embarqué (aucun écran de
 * chargement), puis bascule sur les données de l'API dès qu'elles arrivent. Si l'API
 * est injoignable, on reste sur l'export : le site fonctionne sans back-end.
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
      .catch(() => {
        /* repli silencieux sur les données statiques */
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
