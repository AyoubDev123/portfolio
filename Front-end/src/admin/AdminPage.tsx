import { LogOut, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { admin, ApiError, getMe, login, logout, type Me } from "../lib/api";
import { AccountPanel } from "./AccountPanel";
import { ImportPanel } from "./ImportPanel";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ENTITIES, type EntityDef, type Field, type Row } from "./entities";
import { FormError, toFormState, toPayload, type FormState } from "./form";

export default function AdminPage() {
  useDocumentTitle("Administration · Portfolio");
  // undefined = vérification en cours, null = non connecté
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    setMe(null);
  }, []);

  if (me === undefined) return <p className="container-page pt-20 text-muted">Chargement…</p>;
  if (me === null) return <Login onSuccess={() => getMe().then(setMe).catch(() => setMe(null))} />;
  return <Dashboard me={me} onMeChange={setMe} onSignOut={signOut} />;
}

// ── Connexion ────────────────────────────────────────────────────────────────
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError && err.isExplained && err.status !== 404
          ? err.message
          : "API injoignable : l'espace admin nécessite le back-end.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page grid place-items-center pt-20">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Espace admin</h1>
        <div>
          <label htmlFor="a-user" className="mb-1.5 block text-sm font-medium">
            Identifiant
          </label>
          <input
            id="a-user"
            className="field"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="a-pass" className="mb-1.5 block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="a-pass"
            type="password"
            className="field"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <p role="alert" className="min-h-5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        <p className="text-center text-sm">
          <a href="/mot-de-passe-oublie" className="text-muted hover:text-ink">
            Mot de passe oublié ?
          </a>
        </p>
      </form>
    </div>
  );
}

// ── Tableau de bord ──────────────────────────────────────────────────────────
type Tab = EntityDef | "messages" | "compte";

function Dashboard({
  me,
  onMeChange,
  onSignOut,
}: {
  me: Me;
  onMeChange: (me: Me) => void;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>(ENTITIES[0]);
  // Change après un import : force les éditeurs à recharger leur contenu.
  const [version, setVersion] = useState(0);

  return (
    <div className="container-page pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Administration du contenu</h1>
        <button type="button" onClick={onSignOut} className="btn btn-ghost">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
        </button>
      </div>

      <div className="mt-6">
        <ImportPanel me={me} onMeChange={onMeChange} onImported={() => setVersion((v) => v + 1)} />
      </div>

      <div role="tablist" aria-label="Contenus" className="mt-8 flex flex-wrap gap-2">
        {[...ENTITIES, "messages" as const, "compte" as const].map((t) => {
          const id = typeof t === "string" ? t : t.id;
          const selected = tab === t;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                selected
                  ? "border-brand bg-brand text-on-brand"
                  : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
              }`}
            >
              {t === "messages" ? "Messages" : t === "compte" ? "Mon compte" : t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "compte" ? (
          <AccountPanel me={me} />
        ) : tab === "messages" ? (
          <Messages onAuthError={onSignOut} />
        ) : tab.singleton ? (
          <SingletonEditor key={`${tab.id}-${version}`} def={tab} onAuthError={onSignOut} />
        ) : (
          <CollectionEditor key={`${tab.id}-${version}`} def={tab} onAuthError={onSignOut} />
        )}
      </div>
    </div>
  );
}

interface EditorProps {
  def: EntityDef;
  onAuthError: () => void;
}

function useGuard(onAuthError: () => void) {
  return useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.status === 401) {
        onAuthError();
        return "Session expirée";
      }
      return err instanceof Error ? err.message : "Erreur inconnue";
    },
    [onAuthError],
  );
}

function SingletonEditor({ def, onAuthError }: EditorProps) {
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const guard = useGuard(onAuthError);

  useEffect(() => {
    admin
      .get<Row>(def.path)
      .then(setRow)
      .catch((e) => setError(guard(e)));
  }, [def.path, guard]);

  if (!row) return <p className="text-muted">{error || "Chargement…"}</p>;
  return (
    <RecordForm
      def={def}
      row={row}
      submitLabel="Enregistrer le profil"
      error={error}
      saved={saved}
      onSubmit={async (payload) => {
        setError("");
        setSaved(false);
        try {
          setRow(await admin.update<Row>(def.path, null, payload));
          setSaved(true);
        } catch (e) {
          setError(guard(e));
        }
      }}
    />
  );
}

function CollectionEditor({ def, onAuthError }: EditorProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [experiences, setExperiences] = useState<Row[]>([]);
  const guard = useGuard(onAuthError);

  const load = useCallback(() => {
    admin
      .list<Row>(def.path)
      .then(setRows)
      .catch((e) => setError(guard(e)));
  }, [def.path, guard]);

  useEffect(load, [load]);
  useEffect(() => {
    if (def.id === "projects") admin.list<Row>("experiences").then(setExperiences).catch(() => undefined);
  }, [def.id]);

  const resolvedDef = useMemo<EntityDef>(
    () =>
      def.id !== "projects"
        ? def
        : {
            ...def,
            fields: def.fields.map((f) =>
              f.key === "experience_id"
                ? {
                    ...f,
                    options: [
                      { value: "", label: "— Aucune (projet personnel / académique) —" },
                      ...experiences.map((x) => ({ value: String(x.id), label: String(x.company) })),
                    ],
                  }
                : f,
            ),
          },
    [def, experiences],
  );

  async function remove(id: number) {
    try {
      await admin.remove(def.path, id);
      setConfirmId(null);
      load();
    } catch (e) {
      setError(guard(e));
    }
  }

  if (editing) {
    const isNew = editing === "new";
    return (
      <div>
        <button type="button" className="mb-4 text-sm text-muted hover:text-ink" onClick={() => setEditing(null)}>
          ← Retour à la liste
        </button>
        <RecordForm
          def={resolvedDef}
          row={isNew ? def.defaults : editing}
          submitLabel={isNew ? "Créer" : "Enregistrer"}
          error={error}
          onSubmit={async (payload) => {
            setError("");
            try {
              if (isNew) await admin.create<Row>(def.path, payload);
              else await admin.update<Row>(def.path, (editing as Row).id ?? null, payload);
              setEditing(null);
              load();
            } catch (e) {
              setError(guard(e));
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{def.label}</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setError("");
            setEditing("new");
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {rows === null ? (
        <p className="mt-6 text-muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-muted">Aucun élément.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={String(r.id)} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{def.title(r)}</p>
                {def.subtitle && <p className="truncate text-sm text-muted">{def.subtitle(r)}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost !p-2.5"
                  aria-label={`Modifier ${def.title(r)}`}
                  onClick={() => {
                    setError("");
                    setEditing(r);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {confirmId === r.id ? (
                  <button
                    type="button"
                    className="btn !bg-red-600 !py-2 text-white"
                    onClick={() => remove(r.id as number)}
                    onBlur={() => setConfirmId(null)}
                    autoFocus
                  >
                    Confirmer
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !p-2.5"
                    aria-label={`Supprimer ${def.title(r)}`}
                    onClick={() => setConfirmId(r.id as number)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Formulaire générique ─────────────────────────────────────────────────────
function RecordForm({
  def,
  row,
  submitLabel,
  error,
  saved,
  onSubmit,
}: {
  def: EntityDef;
  row: Row;
  submitLabel: string;
  error: string;
  saved?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [state, setState] = useState<FormState>(() => toFormState(def.fields, row));
  const [localError, setLocalError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError("");
    let payload: Record<string, unknown>;
    try {
      payload = toPayload(def.fields, state);
    } catch (err) {
      setLocalError(err instanceof FormError ? err.message : "Formulaire invalide");
      return;
    }
    setBusy(true);
    await onSubmit(payload);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      {def.fields.map((f) => (
        <FieldInput
          key={f.key}
          field={f}
          value={state[f.key]}
          onChange={(v) => setState((s) => ({ ...s, [f.key]: v }))}
        />
      ))}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Save className="h-4 w-4" aria-hidden="true" /> {busy ? "Enregistrement…" : submitLabel}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {saved && !error && !localError && <span className="text-brand">Enregistré.</span>}
          {(error || localError) && <span className="text-red-600 dark:text-red-400">{localError || error}</span>}
        </p>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
}) {
  const id = `f-${field.key}`;
  const label = (
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
      {field.label}
      {field.required && <span aria-hidden="true"> *</span>}
    </label>
  );

  if (field.type === "bool") {
    return (
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--brand)]"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        {label}
        <select id={id} className="field" value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "textarea" || field.type === "lines" || field.type === "json") {
    return (
      <div>
        {label}
        <textarea
          id={id}
          className={`field resize-y ${field.type === "json" ? "font-mono text-xs" : ""}`}
          rows={field.type === "textarea" ? 3 : field.type === "json" ? 8 : 5}
          required={field.required}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div>
      {label}
      <input
        id={id}
        className="field"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        required={field.required}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Messages reçus ───────────────────────────────────────────────────────────
interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function Messages({ onAuthError }: { onAuthError: () => void }) {
  const [rows, setRows] = useState<Message[] | null>(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const guard = useGuard(onAuthError);

  const load = useCallback(() => {
    admin
      .list<Message>("messages")
      .then(setRows)
      .catch((e) => setError(guard(e)));
  }, [guard]);
  useEffect(load, [load]);

  const markRead = useCallback(
    (id: number) => {
      admin
        .patch<Message>(`messages/${id}/read`)
        .then((updated) => setRows((prev) => prev?.map((m) => (m.id === id ? updated : m)) ?? prev))
        .catch((e) => setError(guard(e)));
    },
    [guard],
  );

  if (error) return <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>;
  if (!rows) return <p className="text-muted">Chargement…</p>;
  if (rows.length === 0) return <p className="text-muted">Aucun message pour l'instant.</p>;

  const unread = rows.filter((m) => !m.is_read).length;

  return (
    <div>
      {unread > 0 && (
        <p className="mb-4 text-sm font-medium text-brand">
          {unread} message{unread > 1 ? "s" : ""} non lu{unread > 1 ? "s" : ""}
        </p>
      )}
      <ul className="space-y-4">
        {rows.map((m) => (
          <li key={m.id} className={`card p-5 ${m.is_read ? "opacity-70" : "ring-1 ring-brand/30"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {!m.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Non lu" />
                )}
                <div>
                  <p className="font-semibold">{m.subject}</p>
                  <p className="text-sm text-muted">
                    {m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a> ·{" "}
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!m.is_read && (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => markRead(m.id)}
                    aria-label={`Marquer comme lu : ${m.subject}`}
                  >
                    Marquer comme lu
                  </button>
                )}
                {confirmId === m.id ? (
                  <button
                    type="button"
                    className="btn !bg-red-600 !py-2 text-white"
                    onClick={() => {
                      setConfirmId(null);
                      admin.remove("messages", m.id).then(load).catch((e) => setError(guard(e)));
                    }}
                    onBlur={() => setConfirmId(null)}
                    autoFocus
                  >
                    Confirmer
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !p-2.5"
                    aria-label={`Supprimer le message de ${m.name}`}
                    onClick={() => setConfirmId(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[0.95rem]">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
