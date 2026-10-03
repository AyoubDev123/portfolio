import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "./translations";

interface LangCtx {
  lang: Lang;
  toggle: () => void;
  t: Translations;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggle = () => setLang((l) => (l === "en" ? "fr" : "en"));
  return <Ctx.Provider value={{ lang, toggle, t: translations[lang] }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
