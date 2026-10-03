import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Contact } from "../components/sections/Contact";
import { Education } from "../components/sections/Education";
import { Experience } from "../components/sections/Experience";
import { Hero } from "../components/sections/Hero";
import { Projects } from "../components/sections/Projects";
import { Skills } from "../components/sections/Skills";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function Home() {
  const { hash } = useLocation();
  useDocumentTitle("Ayoub El Abbassi · Data Scientist / Engineer");

  // Arrivée depuis une autre page avec un ancrage (ex. /#projets) : on fait défiler jusqu'à la section.
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
