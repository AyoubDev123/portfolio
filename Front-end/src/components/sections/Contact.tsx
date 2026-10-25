import { CheckCircle2, Download, Mail, MapPin, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError, sendContact } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { usePortfolio } from "../../lib/portfolio";
import { useReveal } from "../../lib/useReveal";
import { GithubIcon, LinkedinIcon } from "../icons";
import { Section } from "../Section";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };

export function Contact() {
  const { data, slug } = usePortfolio();
  const { profile } = data;
  const { t } = useLang();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const wrapperRef = useReveal<HTMLDivElement>();

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      await sendContact(slug, form);
      setForm(EMPTY);
      setStatus({ kind: "sent" });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status !== 404 && err.status < 500
          ? err.message
          : `The sending service is temporarily unavailable. Write directly to ${profile.email}.`;
      setStatus({ kind: "error", message });
    }
  }

  return (
    <Section
      id="contact"
      index={t.contactIndex}
      eyebrow={t.contactEyebrow}
      title={t.contactTitle}
      intro={t.contactIntro}
    >
      <div ref={wrapperRef} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <a
            href={`mailto:${profile.email}`}
            data-reveal
            style={{ "--i": 0 } as React.CSSProperties}
            className="card flex items-center gap-4 p-5 hover:border-brand"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-muted">{t.emailLabel}</span>
              <span className="block truncate font-semibold">{profile.email}</span>
            </span>
          </a>
          {profile.city && (
            <div
              data-reveal
              style={{ "--i": 1 } as React.CSSProperties}
              className="card flex items-center gap-4 p-5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">{t.locationLabel}</span>
                <span className="block font-semibold">{profile.city}</span>
              </span>
            </div>
          )}
          {profile.cv_url && (
            <a
              href={profile.cv_url}
              download
              data-reveal
              style={{ "--i": 2 } as React.CSSProperties}
              className="card flex items-center gap-4 p-5 hover:border-brand"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Download className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">{t.cvLabel}</span>
                <span className="block font-semibold">{t.downloadCVFull}</span>
              </span>
            </a>
          )}
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              data-reveal
              style={{ "--i": 3 } as React.CSSProperties}
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
              data-reveal
              style={{ "--i": 4 } as React.CSSProperties}
              className="card flex items-center gap-4 p-5 hover:border-brand"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <GithubIcon />
              </span>
              <span className="font-semibold">GitHub</span>
            </a>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          data-reveal
          style={{ "--i": 1 } as React.CSSProperties}
          className="card space-y-4 p-6 sm:p-7"
          noValidate={false}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">
                {t.nameField}
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
                {t.emailField}
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
              {t.subjectField}
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
              {t.messageField}
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

          {/* Honeypot: invisible to humans, filled by bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="c-website">Do not fill</label>
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
              {status.kind === "sending" ? t.sendingBtn : t.sendBtn}
            </button>
            <p role="status" aria-live="polite" className="text-sm">
              {status.kind === "sent" && (
                <span className="inline-flex items-center gap-2 text-brand">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t.sentMsg}
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
