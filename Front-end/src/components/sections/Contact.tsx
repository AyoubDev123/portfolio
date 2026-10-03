import { CheckCircle2, Download, Mail, MapPin, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError, sendContact } from "../../lib/api";
import { usePortfolio } from "../../lib/portfolio";
import { GithubIcon, LinkedinIcon } from "../icons";
import { Section } from "../Section";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };

export function Contact() {
  const { data } = usePortfolio();
  const { profile } = data;
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      await sendContact(form);
      setForm(EMPTY);
      setStatus({ kind: "sent" });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status !== 404 && err.status < 500
          ? err.message
          : `Le service d'envoi est momentanément indisponible. Écrivez-moi directement à ${profile.email}.`;
      setStatus({ kind: "error", message });
    }
  }

  return (
    <Section
      id="contact"
      index="06"
      eyebrow="Contact"
      title="Travaillons ensemble"
      intro="Une question, une opportunité, un projet data ou IA ? Écrivez-moi, je réponds rapidement."
    >
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <a href={`mailto:${profile.email}`} className="card flex items-center gap-4 p-5 hover:border-brand">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-muted">E-mail</span>
              <span className="block truncate font-semibold">{profile.email}</span>
            </span>
          </a>
          {profile.city && (
            <div className="card flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">Localisation</span>
                <span className="block font-semibold">{profile.city}</span>
              </span>
            </div>
          )}
          {profile.cv_url && (
            <a href={profile.cv_url} download className="card flex items-center gap-4 p-5 hover:border-brand">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Download className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">Curriculum vitae</span>
                <span className="block font-semibold">Télécharger le CV (PDF)</span>
              </span>
            </a>
          )}
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              className="card flex items-center gap-4 p-5 hover:border-brand"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <LinkedinIcon />
              </span>
              <span className="font-semibold">LinkedIn</span>
            </a>
          )}
          {profile.github && (
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer noopener"
              className="card flex items-center gap-4 p-5 hover:border-brand"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <GithubIcon />
              </span>
              <span className="font-semibold">GitHub</span>
            </a>
          )}
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-7" noValidate={false}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">
                Nom
              </label>
              <input
                id="c-name"
                className="field"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
              />
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">
                E-mail
              </label>
              <input
                id="c-email"
                type="email"
                className="field"
                required
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
              />
            </div>
          </div>
          <div>
            <label htmlFor="c-subject" className="mb-1.5 block text-sm font-medium">
              Sujet
            </label>
            <input
              id="c-subject"
              className="field"
              required
              minLength={2}
              maxLength={200}
              value={form.subject}
              onChange={set("subject")}
            />
          </div>
          <div>
            <label htmlFor="c-message" className="mb-1.5 block text-sm font-medium">
              Message
            </label>
            <textarea
              id="c-message"
              className="field min-h-36 resize-y"
              required
              minLength={10}
              maxLength={5000}
              value={form.message}
              onChange={set("message")}
            />
          </div>

          {/* Honeypot : invisible pour les humains, rempli par les bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="c-website">Ne pas remplir</label>
            <input
              id="c-website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={set("website")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="btn btn-primary" disabled={status.kind === "sending"}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {status.kind === "sending" ? "Envoi en cours…" : "Envoyer le message"}
            </button>
            <p role="status" aria-live="polite" className="text-sm">
              {status.kind === "sent" && (
                <span className="inline-flex items-center gap-2 text-brand">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Message envoyé, merci !
                </span>
              )}
              {status.kind === "error" && <span className="text-red-600 dark:text-red-400">{status.message}</span>}
            </p>
          </div>
        </form>
      </div>
    </Section>
  );
}
