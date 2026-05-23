// api.ts — Couche HTTP complète SHIELD v3
// Inclut : auth, register, keys, signatures, documents, search, ocr, admin, password reset

import type {
  LoginFormData, LoginResponse, Verify2FARequest, Verify2FAResponse,
  UserInfo, CryptographicKey, SignatureListItem, SignRequest, SignResponse,
  VerifyRequest, VerifyResponse, IntegrityResponse, SearchResponse, OCRResponse,
  Enable2FAResponse, Status2FAResponse, AgentOfficielCreate, AdminCreate,
  CitoyenCreate, APIResponse, UploadResponse, FinalizeResponse,
  MyDocumentsResponse, SimpleListResponse, AdminUsersResponse, AdminLogsResponse,
  AdminStats, ActiveSession, AdminUser,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const TOKEN_KEY = "shield_token";
const USER_KEY  = "shield_user";

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: (): UserInfo | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  },
  set: (user: UserInfo) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  remove: () => localStorage.removeItem(USER_KEY),
};

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
  formData?: FormData;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, token, formData } = options;
  const headers: Record<string, string> = {};
  const authToken = token ?? tokenStorage.get();
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { detail?: string };
      detail = err.detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (data: LoginFormData) =>
    apiFetch<LoginResponse>("/auth/login", { method: "POST", body: data }),

  verify2FA: (data: Verify2FARequest) =>
    apiFetch<Verify2FAResponse>("/auth/verify-2fa", { method: "POST", body: data }),

  requestEmail2FA: (temp_token: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/2fa/request-email", {
      method: "POST", body: { temp_token },
    }),

  getMe: (token?: string) => apiFetch<UserInfo>("/auth/me", { token }),

  get2FAStatus: () => apiFetch<Status2FAResponse>("/auth/2fa/status"),

  enable2FA: () => apiFetch<Enable2FAResponse>("/auth/2fa/enable", { method: "POST" }),

  disable2FA: (code_2fa?: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/2fa/disable", {
      method: "POST", body: { code_2fa },
    }),

  // ── Password Reset ──────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/forgot-password", {
      method: "POST", body: { email },
    }),

  resetPassword: (token: string, new_password: string, confirm_password: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/reset-password", {
      method: "POST", body: { token, new_password, confirm_password },
    }),
};

// ─── Register ──────────────────────────────────────────────────────────────

export const registerAPI = {
  agent:   (data: AgentOfficielCreate) => apiFetch<APIResponse>("/register/agent",   { method: "POST", body: data }),
  admin:   (data: AdminCreate)         => apiFetch<APIResponse>("/register/admin",   { method: "POST", body: data }),
  citoyen: (data: CitoyenCreate)       => apiFetch<APIResponse>("/register/citoyen", { method: "POST", body: data }),
};

// ─── Keys ──────────────────────────────────────────────────────────────────

export const keysAPI = {
  generate: () => apiFetch<CryptographicKey>("/keys/generate", { method: "POST" }),
  renew:    () => apiFetch<CryptographicKey>("/keys/renew",    { method: "POST" }),
  myKeys:   () => apiFetch<CryptographicKey[]>("/keys/my-keys"),
};

// ─── Signatures ────────────────────────────────────────────────────────────

export const signaturesAPI = {
  sign:         (data: SignRequest) => apiFetch<SignResponse>("/signatures/sign",             { method: "POST", body: data }),
  verify:       (data: VerifyRequest) => apiFetch<VerifyResponse>("/signatures/verify",      { method: "POST", body: data }),
  validate:     (id: string) => apiFetch<IntegrityResponse>(`/signatures/validate/${id}`),
  mySignatures: (limit = 50, offset = 0) => apiFetch<SignatureListItem[]>(`/signatures/my-signatures?limit=${limit}&offset=${offset}`),
  pending:      () => apiFetch<Record<string, unknown>[]>("/signatures/pending"),
  stats:        () => apiFetch<Record<string, unknown>>("/signatures/stats"),
};

// ─── Documents ─────────────────────────────────────────────────────────────

export const documentsAPI = {
  upload: (file: File, titre: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("titre", titre);
    return apiFetch<UploadResponse>("/documents/upload", { method: "POST", formData: fd });
  },
  finalize: (communique_id: string, signature_id: string, pdf_file: File, qr_x: number, qr_y: number, qr_size: number) => {
    const fd = new FormData();
    fd.append("communique_id", communique_id);
    fd.append("signature_id", signature_id);
    fd.append("pdf_file", pdf_file);
    fd.append("qr_x", String(qr_x));
    fd.append("qr_y", String(qr_y));
    fd.append("qr_size", String(qr_size));
    return apiFetch<FinalizeResponse>("/documents/finalize", { method: "POST", formData: fd });
  },
  archive:     (communique_id: string) => {
    const fd = new FormData();
    fd.append("communique_id", communique_id);
    return apiFetch<{ success: boolean; message: string }>("/documents/archive", { method: "POST", formData: fd });
  },
  myDocuments: () => apiFetch<MyDocumentsResponse>("/documents/my"),
  downloadUrl: (id: string) => `${API_URL}/documents/${id}/download`,
  delete:      (id: string) => apiFetch<{ success: boolean; message: string }>(`/documents/delete/${id}`, { method: "DELETE" }),
  unarchive:   (id: string) => apiFetch<{ success: boolean; message: string }>(`/documents/${id}/unarchive`, { method: "PATCH" }),
  verify:      (file: File, qr_data: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("qr_data", qr_data);
    return apiFetch<{ success: boolean; is_authentic: boolean; message: string; details?: Record<string, unknown> }>(
      "/documents/verify", { method: "POST", formData: fd }
    );
  },
};

// ─── Search ────────────────────────────────────────────────────────────────

export const searchAPI = {
  simple:      (q: string, page = 1, limit = 20) => apiFetch<SearchResponse>(`/search/simple?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),
  suggestions: (q: string, limit = 5) => apiFetch<{ query: string; suggestions: string[] }>(`/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`),
  popular:     (limit = 10) => apiFetch<SimpleListResponse>(`/search/popular?limit=${limit}`),
  recent:      (limit = 10) => apiFetch<SimpleListResponse>(`/search/recent?limit=${limit}`),
};

// ─── OCR ───────────────────────────────────────────────────────────────────

export const ocrAPI = {
  extract: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<OCRResponse>("/ocr/extract", { method: "POST", formData: fd });
  },
};

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminAPI = {
  // Création
  createAgent: (data: {
    nom: string; prenom: string; email: string;
    id_institution: string; fonction: string;
    departement?: string; matricule?: string;
  }) => apiFetch<{ success: boolean; message: string; user: AdminUser }>("/admin/users/agent", { method: "POST", body: data }),

  createAdmin: (data: {
    nom: string; prenom: string; email: string;
    niveau_habilitation: string;
  }) => apiFetch<{ success: boolean; message: string; user: AdminUser }>("/admin/users/admin", { method: "POST", body: data }),

  // Contrôle accès
  toggleAccess: (userId: string) =>
    apiFetch<{ success: boolean; message: string; token_autorise: boolean }>(
      `/admin/users/${userId}/toggle-access`, { method: "PATCH" }
    ),

  toggle2FA: (userId: string) =>
    apiFetch<{ success: boolean; message: string; deux_fa_actif: boolean }>(
      `/admin/users/${userId}/toggle-2fa`, { method: "PATCH" }
    ),

  resetPassword: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/admin/users/${userId}/reset-password`, { method: "POST" }
    ),

  // Liste & filtres
  listUsers: (params: {
    search?: string; role?: string;
    token_autorise?: boolean; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.search)        q.set("search", params.search);
    if (params.role)          q.set("role", params.role);
    if (params.token_autorise !== undefined) q.set("token_autorise", String(params.token_autorise));
    if (params.page)          q.set("page", String(params.page));
    if (params.limit)         q.set("limit", String(params.limit));
    return apiFetch<AdminUsersResponse>(`/admin/users?${q.toString()}`);
  },

  activeSessions: () =>
    apiFetch<{ success: boolean; sessions: ActiveSession[]; total: number }>("/admin/users/active-sessions"),

  // Logs
  getLogs: (params: {
    user_id?: string; action?: string;
    succes?: boolean; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.user_id) q.set("user_id", params.user_id);
    if (params.action)  q.set("action", params.action);
    if (params.succes !== undefined) q.set("succes", String(params.succes));
    if (params.page)    q.set("page", String(params.page));
    if (params.limit)   q.set("limit", String(params.limit));
    return apiFetch<AdminLogsResponse>(`/admin/logs?${q.toString()}`);
  },

  // Stats
  getStats: () => apiFetch<{ success: boolean } & AdminStats>("/admin/stats"),
};
