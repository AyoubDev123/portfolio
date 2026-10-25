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
  const isForm = init.body instanceof FormData;
  if (init.body && !isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

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
export const fetchPortfolio = (slug: string, signal?: AbortSignal) =>
  request<Portfolio>(`/api/p/${encodeURIComponent(slug)}`, { signal });

export const sendContact = (slug: string, payload: ContactPayload) =>
  request<{ ok: boolean }>(`/api/p/${encodeURIComponent(slug)}/contact`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  request<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const logout = () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

export interface Me {
  username: string;
  slug: string;
  email: string;
  published: boolean;
  is_staff: boolean;
  email_verified: boolean;
}

export const getMe = () => request<Me>("/api/auth/me");

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const signup = (payload: SignupPayload) =>
  request<{ ok: boolean }>("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });

export const changeSlug = (slug: string) =>
  request<Me>("/api/auth/slug", { method: "PUT", body: JSON.stringify({ slug }) });

export const publishPortfolio = () => request<Me>("/api/auth/publish", { method: "POST" });

// ── Admin ────────────────────────────────────────────────────────────────────
export const admin = {
  list: <T>(path: string) => request<T[]>(`/api/admin/${path}`),
  get: <T>(path: string) => request<T>(`/api/admin/${path}`),
  create: <T>(path: string, body: unknown) =>
    request<T>(`/api/admin/${path}`, { method: "POST", body: JSON.stringify(body) }),
  update: <T>(path: string, id: number | null, body: unknown) =>
    request<T>(`/api/admin/${path}${id === null ? "" : `/${id}`}`, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string) =>
    request<T>(`/api/admin/${path}`, { method: "PATCH" }),
  remove: (path: string, id: number) =>
    request<void>(`/api/admin/${path}/${id}`, { method: "DELETE" }),
};

export interface CvImportResult {
  counts: Record<string, number>;
  warnings: string[];
}

export const importCv = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return request<CvImportResult>("/api/admin/import-cv", { method: "POST", body });
};

// ── Compte ───────────────────────────────────────────────────────────────────
export const requestVerification = () =>
  request<{ ok: boolean }>("/api/auth/verify/request", { method: "POST" });

export const confirmVerification = (token: string) =>
  request<{ ok: boolean }>(`/api/auth/verify/${encodeURIComponent(token)}`, { method: "POST" });

export const forgotPassword = (email: string) =>
  request<{ ok: boolean }>("/api/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });

export const resetPassword = (token: string, password: string) =>
  request<{ ok: boolean }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export const exportMyData = () => request<unknown>("/api/auth/export");

export const deleteMyAccount = (password: string) =>
  request<void>("/api/auth/account/delete", { method: "POST", body: JSON.stringify({ password }) });
