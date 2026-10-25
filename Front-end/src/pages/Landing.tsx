import { ArrowRight, FileUp, Globe, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { DEMO_SLUG } from "../lib/portfolio";

const STEPS = [
  {
    icon: FileUp,
    title: "Dépose ton CV",
    text: "Expériences, projets, formations et compétences en sont extraits automatiquement.",
  },
  {
    icon: ShieldCheck,
    title: "Vérifie ce qu'on a compris",
    text: "Les incohérences de dates et les manques te sont signalés avant publication.",
  },
  {
    icon: Globe,
    title: "Publie",
    text: "Ton portfolio vit sur une adresse que tu peux coller sur ton CV et sur LinkedIn.",
  },
];

export default function Landing() {
  useDocumentTitle("Portfolio Builder — ton portfolio à partir de ton CV");

  return (
    <div className="container-page pt-16 pb-24">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-[clamp(2.2rem,6vw,3.5rem)] font-semibold leading-[1.08] tracking-tight">
          Ton portfolio, à partir de ton CV
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Pas de formulaire vide à remplir. Tu déposes ton CV, on en sort le contenu, tu corriges ce
          qui ne va pas, et tu publies.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="btn btn-primary">
            Créer mon portfolio <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to={`/${DEMO_SLUG}`} className="btn btn-ghost">
            Voir un exemple
          </Link>
        </div>
      </section>

      <section aria-label="Comment ça marche" className="mt-20 grid gap-5 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
            </div>
            <h2 className="mt-4 font-semibold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 rounded-2xl border border-line bg-surface p-8 text-center sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight">Vous êtes une école ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Suivez la progression d'une promotion entière, repérez les étudiants bloqués et exportez un
          rapport d'insertion.
        </p>
        <a href="mailto:contact@example.com" className="btn btn-ghost mt-6">
          Nous contacter
        </a>
      </section>
    </div>
  );
}
