import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, signup } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function Signup() {
  useDocumentTitle("Créer mon portfolio");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!SLUG_RE.test(form.username)) {
      setError("L'adresse ne peut contenir que des minuscules, des chiffres et des tirets.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await signup(form);
      navigate("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status < 500
          ? err.message
          : "Service indisponible. Réessaie dans un instant.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page grid place-items-center pt-16 pb-24">
      <form onSubmit={submit} className="card w-full max-w-md space-y-5 p-7">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Créer mon portfolio</h1>
          <p className="mt-1.5 text-sm text-muted">Gratuit, et en ligne en quelques minutes.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="s-first" className="mb-1.5 block text-sm font-medium">
              Prénom
            </label>
            <input id="s-first" className="field" required autoComplete="given-name" value={form.first_name} onChange={set("first_name")} />
          </div>
          <div>
            <label htmlFor="s-last" className="mb-1.5 block text-sm font-medium">
              Nom
            </label>
            <input id="s-last" className="field" required autoComplete="family-name" value={form.last_name} onChange={set("last_name")} />
          </div>
        </div>

        <div>
          <label htmlFor="s-user" className="mb-1.5 block text-sm font-medium">
            Adresse de ton portfolio
          </label>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm text-muted">/</span>
            <input
              id="s-user"
              className="field"
              required
              minLength={3}
              autoComplete="username"
              placeholder="marie-dupont"
              value={form.username}
              onChange={set("username")}
            />
          </div>
          <p className="mt-1.5 font-mono text-xs text-muted">
            Ton portfolio sera visible sur /{form.username || "ton-nom"}
          </p>
        </div>

        <div>
          <label htmlFor="s-email" className="mb-1.5 block text-sm font-medium">
            E-mail
          </label>
          <input id="s-email" type="email" className="field" required autoComplete="email" value={form.email} onChange={set("email")} />
        </div>

        <div>
          <label htmlFor="s-pass" className="mb-1.5 block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="s-pass"
            type="password"
            className="field"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
          />
          <p className="mt-1.5 text-xs text-muted">8 caractères minimum.</p>
        </div>

        <p role="alert" className="min-h-5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Création…" : "Créer mon portfolio"}
        </button>

        <p className="text-center text-sm text-muted">
          Déjà un compte ? <Link to="/admin" className="text-brand hover:underline">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
