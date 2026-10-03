import type { Field, Row } from "./entities";

/** État du formulaire : tout est stocké sous forme de chaînes / booléens. */
export type FormState = Record<string, string | boolean>;

export function toFormState(fields: Field[], row: Row): FormState {
  const state: FormState = {};
  for (const f of fields) {
    const v = row[f.key];
    switch (f.type) {
      case "lines":
        state[f.key] = Array.isArray(v) ? v.join("\n") : "";
        break;
      case "json":
        state[f.key] = JSON.stringify(v ?? [], null, 2);
        break;
      case "bool":
        state[f.key] = Boolean(v);
        break;
      default:
        state[f.key] = v === null || v === undefined ? "" : String(v);
    }
  }
  return state;
}

export class FormError extends Error {}

/** Convertit l'état du formulaire en charge utile conforme au schéma de l'API. */
export function toPayload(fields: Field[], state: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = state[f.key];
    switch (f.type) {
      case "lines":
        out[f.key] = String(raw)
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        break;
      case "json":
        try {
          out[f.key] = JSON.parse(String(raw) || "[]");
        } catch {
          throw new FormError(`« ${f.label} » : JSON invalide`);
        }
        break;
      case "bool":
        out[f.key] = Boolean(raw);
        break;
      case "number":
        out[f.key] = raw === "" ? 0 : Number(raw);
        break;
      case "date":
        out[f.key] = raw === "" ? null : String(raw);
        break;
      case "select":
        out[f.key] = f.key.endsWith("_id") ? (raw === "" ? null : Number(raw)) : String(raw);
        break;
      default:
        out[f.key] = String(raw);
    }
  }
  return out;
}
