import { Link } from "react-router-dom";
import { useLang } from "../lib/lang";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function NotFound() {
  const { t } = useLang();
  useDocumentTitle(`${t.notFoundTitle} · Ayoub El Abbassi`);
  return (
    <div className="container-page grid place-items-center pt-28 text-center">
      <p className="eyebrow">{t.notFoundEyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{t.notFoundTitle}</h1>
      <p className="mt-3 text-muted">{t.notFoundText}</p>
      <Link to="/" className="btn btn-primary mt-8">
        {t.backHome}
      </Link>
    </div>
  );
}
