import { AlertTriangle, ExternalLink, FileUp, Globe } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, importCv, publishPortfolio, type CvImportResult, type Me } from "../lib/api";

const LABELS: Record<string, string> = {
  experiences: "expériences",
  projects: "projets",
  education: "formations",
  certifications: "certifications",
  skill_groups: "groupes de compétences",
  interests: "centres d'intérêt",
};

interface Props {
  me: Me;
  onMeChange: (me: Me) => void;
  onImported: () => void;
}

export function ImportPanel({ me, onMeChange, onImported }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CvImportResult | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await importCv(file));
      onImported();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status < 500
          ? err.message
          : "L'analyse du CV a échoué. Réessaie dans un instant.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function publish() {
    try {
      onMeChange(await publishPortfolio());
    } catch {
      setError("La publication a échoué.");
    }
  }

  const url = `/${me.slug}`;

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Globe className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Adresse de ton portfolio</p>
          {me.published ? (
            <a href={url} className="flex items-center gap-1.5 font-mono text-sm font-semibold text-brand hover:underline">
              {url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="font-mono text-sm text-muted">
              {url} <span className="font-sans">— visible une fois publié</span>
            </p>
          )}
        </div>
        {me.published ? (
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">En ligne</span>
        ) : (
          <button type="button" onClick={publish} className="btn btn-primary">
            Publier
          </button>
        )}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <FileUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Remplir depuis mon CV</p>
            <p className="text-sm text-muted">
              Le contenu existant est remplacé. Ta photo et tes liens sont conservés.
            </p>
          </div>
          {/* L'input porte le focus clavier ; sans `peer`, l'anneau de focus
              s'afficherait sur un élément d'1 px et serait invisible. */}
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            className="peer sr-only"
            id="cv-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <label
            htmlFor="cv-file"
            className={`btn btn-ghost peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
              busy ? "pointer-events-none opacity-60" : "cursor-pointer"
            }`}
          >
            {busy ? "Analyse en cours…" : "Choisir un PDF"}
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <div>
              <p className="text-sm font-medium">Repris de ton CV</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(result.counts)
                  .filter(([, n]) => n > 0)
                  .map(([key, n]) => (
                    <li key={key} className="chip">
                      {n} {LABELS[key] ?? key}
                    </li>
                  ))}
              </ul>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-xl border border-warm/40 bg-warm/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-warm">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {result.warnings.length} point(s) à vérifier avant de publier
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {result.warnings.map((w) => (
                    <li key={w} className="text-sm leading-relaxed text-warm">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
