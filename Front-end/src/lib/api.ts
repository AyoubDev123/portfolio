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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include", // envoie le cookie HttpOnly access_token automatiquement
  });
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

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  request<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

export const getMe = () => request<{ username: string }>("/api/auth/me");

// ── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  list: <T>(path: string) => request<T[]>(`/api/admin/${path}`),
  get: <T>(path: string) => request<T>(`/api/admin/${path}`),
  create: <T>(path: string, body: unknown) =>
    request<T>(`/api/admin/${path}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T>(path: string, id: number | null, body: unknown) =>
    request<T>(`/api/admin/${path}${id === null ? "" : `/${id}`}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (path: string, id: number) =>
    request<void>(`/api/admin/${path}/${id}`, { method: "DELETE" }),
};
