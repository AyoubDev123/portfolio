import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import staticData from "../data/portfolio.static.json";
import { fetchPortfolio } from "./api";
import { useLang } from "./lang";
import { localizePortfolio } from "./localize";
import type { Portfolio } from "./types";

export type DataSource = "static" | "api" | "loading" | "missing";

interface PortfolioCtx {
  data: Portfolio;
  source: DataSource;
  slug: string;
}

const Ctx = createContext<PortfolioCtx | null>(null);

/** Portfolio embarqué dans le bundle : sert de repli au portfolio de démonstration. */
export const DEMO_SLUG = "ayoub";

/**
 * Charge le portfolio de `slug` depuis l'API.
 *
 * Le JSON statique n'est un repli valable que pour le portfolio de démonstration :
 * afficher son contenu sous l'adresse de quelqu'un d'autre serait faux.
 */
export function PortfolioProvider({ children, slug }: { children: ReactNode; slug: string }) {
  const isDemo = slug === DEMO_SLUG;
  const [state, setState] = useState<{ data: Portfolio; source: DataSource }>(() => ({
    data: staticData as Portfolio,
    source: isDemo ? "static" : "loading",
  }));

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ data: s.data, source: isDemo ? "static" : "loading" }));

    fetchPortfolio(slug, ctrl.signal)
      .then((data) => setState({ data, source: "api" }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ data: s.data, source: isDemo ? "static" : "missing" }));
        void err;
      });

    return () => ctrl.abort();
  }, [slug, isDemo]);

  // Les traductions sont résolues ici : les composants consomment toujours
  // `data` dans la langue courante et n'ont pas à connaître i18n.
  const { lang } = useLang();
  const value = useMemo(
    () => ({ data: localizePortfolio(state.data, lang), source: state.source, slug }),
    [state, lang, slug],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortfolio(): PortfolioCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortfolio doit être utilisé dans <PortfolioProvider>");
  return ctx;
}
