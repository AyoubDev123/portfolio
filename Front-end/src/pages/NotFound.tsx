import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page introuvable · Ayoub El Abbassi");
  return (
    <div className="container-page grid place-items-center pt-28 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cette page n'existe pas</h1>
      <p className="mt-3 text-muted">Le lien est peut-être erroné ou le projet a été déplacé.</p>
      <Link to="/" className="btn btn-primary mt-8">
        Retour à l'accueil
      </Link>
    </div>
  );
}
