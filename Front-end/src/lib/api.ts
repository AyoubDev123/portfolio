import type { ContactPayload, Portfolio } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* corps non JSON (ex. page d'erreur d'un proxy) */
  }
  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    throw new ApiError(res.status, formatDetail(detail) ?? `Erreur ${res.status}`);
  }
  if (body === null) throw new ApiError(res.status, "Réponse inattendue du serveur");
  return body as T;
}

function formatDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg ?? "invalide"}`)
      .join(" · ");
  }
  return null;
}

// ── Public ───────────────────────────────────────────────────────────────────
export const fetchPortfolio = (signal?: AbortSignal) => request<Portfolio>("/api/portfolio", { signal });

export const sendContact = (payload: ContactPayload) =>
  request<{ ok: boolean }>("/api/contact", { method: "POST", body: JSON.stringify(payload) });

// ── Admin ────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  request<{ access_token: string; expires_in: number }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const admin = {
  list: <T>(path: string, token: string) => request<T[]>(`/api/admin/${path}`, {}, token),
  get: <T>(path: string, token: string) => request<T>(`/api/admin/${path}`, {}, token),
  create: <T>(path: string, body: unknown, token: string) =>
    request<T>(`/api/admin/${path}`, { method: "POST", body: JSON.stringify(body) }, token),
  update: <T>(path: string, id: number | null, body: unknown, token: string) =>
    request<T>(`/api/admin/${path}${id === null ? "" : `/${id}`}`, { method: "PUT", body: JSON.stringify(body) }, token),
  remove: (path: string, id: number, token: string) =>
    request<void>(`/api/admin/${path}/${id}`, { method: "DELETE" }, token),
};
