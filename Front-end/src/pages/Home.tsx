import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Contact } from "../components/sections/Contact";
import { Education } from "../components/sections/Education";
import { Experience } from "../components/sections/Experience";
import { Hero } from "../components/sections/Hero";
import { Projects } from "../components/sections/Projects";
import { Skills } from "../components/sections/Skills";
import { useLang } from "../lib/lang";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function Home() {
  const { hash } = useLocation();
  const { t } = useLang();
  useDocumentTitle(t.pageTitle);

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: "instant" });
  }, [hash]);

  return (
    <>
      <Hero />
      <Experience />
      <Projects />
      <Skills />
      <Education />
      <Contact />
    </>
  );
}
