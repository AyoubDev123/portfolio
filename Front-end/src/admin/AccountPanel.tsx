import { AlertTriangle, Download, MailCheck } from "lucide-react";
import { useState } from "react";
import { deleteMyAccount, exportMyData, requestVerification, type Me } from "../lib/api";

export function AccountPanel({ me }: { me: Me }) {
  const [sent, setSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function download() {
    const data = await exportMyData();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mes-donnees-${me.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    setError("");
    try {
      await deleteMyAccount(password);
      window.location.href = "/";
    } catch {
      setError("Mot de passe incorrect.");
    }
  }

  return (
    <div className="space-y-4">
      {!me.email_verified && (
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Confirme ton adresse e-mail</p>
            <p className="text-sm text-muted">
              {sent ? "Un nouveau lien vient d'être envoyé à " : "Un lien a été envoyé à "}
              {me.email}.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => requestVerification().then(() => setSent(true))}
          >
            Renvoyer le lien
          </button>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Exporter mes données</p>
          <p className="text-sm text-muted">
            Ton compte, ton portfolio et les messages reçus, au format JSON.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={download}>
          Télécharger
        </button>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Supprimer mon compte</p>
            <p className="text-sm text-muted">
              Ton portfolio, ton contenu et tes messages sont effacés définitivement.
            </p>
          </div>
          {!confirming && (
            <button
              type="button"
              className="btn btn-ghost !border-red-600/40 !text-red-600 dark:!text-red-400"
              onClick={() => setConfirming(true)}
            >
              Supprimer
            </button>
          )}
        </div>

        {confirming && (
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <label htmlFor="del-pass" className="block text-sm font-medium">
              Confirme avec ton mot de passe
            </label>
            <input
              id="del-pass"
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn !bg-red-600 !text-white" onClick={remove}>
                Supprimer définitivement
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setError("");
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
