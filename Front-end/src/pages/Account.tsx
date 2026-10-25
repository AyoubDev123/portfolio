import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, confirmVerification, forgotPassword, resetPassword } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  useDocumentTitle(title);
  return (
    <div className="container-page grid place-items-center pt-20 pb-24">
      <div className="card w-full max-w-md space-y-5 p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/** Cible du lien envoyé par e-mail : /verifier?token=… */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"pending" | "ok" | "failed">("pending");

  useEffect(() => {
    if (!token) {
      setState("failed");
      return;
    }
    confirmVerification(token)
      .then(() => setState("ok"))
      .catch(() => setState("failed"));
  }, [token]);

  return (
    <Shell title="Confirmation de ton adresse">
      {state === "pending" && <p className="text-muted">Vérification en cours…</p>}
      {state === "ok" && (
        <>
          <p className="text-muted">Ton adresse est confirmée.</p>
          <Link to="/admin" className="btn btn-primary w-full">
            Aller à mon portfolio
          </Link>
        </>
      )}
      {state === "failed" && (
        <>
          <p role="alert" className="text-red-600 dark:text-red-400">
            Ce lien est invalide ou a expiré.
          </p>
          <p className="text-sm text-muted">
            Connecte-toi et demande un nouveau lien depuis ton espace.
          </p>
          <Link to="/admin" className="btn btn-ghost w-full">
            Se connecter
          </Link>
        </>
      )}
    </Shell>
  );
}

/** Demande de réinitialisation : /mot-de-passe-oublie */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await forgotPassword(email);
    } catch {
      /* La réponse est volontairement identique dans tous les cas. */
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <Shell title="Mot de passe oublié">
      {sent ? (
        <>
          <p className="text-muted">
            Si un compte existe avec cette adresse, un lien vient d'être envoyé. Il expire dans une
            heure.
          </p>
          <Link to="/admin" className="btn btn-ghost w-full">
            Retour à la connexion
          </Link>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="f-email" className="mb-1.5 block text-sm font-medium">
              Ton adresse e-mail
            </label>
            <input
              id="f-email"
              type="email"
              className="field"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Envoi…" : "Recevoir un lien"}
          </button>
        </form>
      )}
    </Shell>
  );
}

/** Cible du lien de réinitialisation : /nouveau-mot-de-passe?token=… */
export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await resetPassword(token, password);
      navigate("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError && err.isExplained
          ? err.message
          : "Service indisponible. Réessaie dans un instant.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Nouveau mot de passe">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="r-pass" className="mb-1.5 block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="r-pass"
            type="password"
            className="field"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">8 caractères minimum.</p>
        </div>
        <p role="alert" className="min-h-5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Enregistrement…" : "Changer mon mot de passe"}
        </button>
      </form>
    </Shell>
  );
}
