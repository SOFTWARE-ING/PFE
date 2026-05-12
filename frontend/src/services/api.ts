import type {
  LoginFormData,
  LoginResponse,
  Verify2FARequest,
  Verify2FAResponse,
  UserInfo,
  CryptographicKey,
  SignatureListItem,
  SignRequest,
  SignResponse,
  VerifyRequest,
  VerifyResponse,
  IntegrityResponse,
  SearchResponse,
  OCRResponse,
  Enable2FAResponse,
  Status2FAResponse,
  AgentOfficielCreate,
  AdminCreate,
  CitoyenCreate,
  APIResponse,
} from "../types";

export interface PopularResult {
  id: string;
  titre: string;
  statut: string;
  date_publication: string;
  nb_consultations?: number;
}

export interface SimpleListResponse {
  success: boolean;
  total: number;
  results: PopularResult[];
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// ─── Token storage ─────────────────────────────────────────────────────────

const TOKEN_KEY = "shield_token";
const USER_KEY = "shield_user";

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

// ─── Core fetch wrapper ────────────────────────────────────────────────────

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
  formData?: FormData;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, token, formData } = options;

  const headers: Record<string, string> = {};

  const authToken = token ?? tokenStorage.get();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }

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
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (data: LoginFormData) =>
    apiFetch<LoginResponse>("/auth/login", { method: "POST", body: data }),

  verify2FA: (data: Verify2FARequest) =>
    apiFetch<Verify2FAResponse>("/auth/verify-2fa", {
      method: "POST",
      body: data,
    }),

  requestEmail2FA: (temp_token: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/2fa/request-email", {
      method: "POST",
      body: { temp_token },
    }),

  // getMe: () => apiFetch<UserInfo>("/auth/me"),
  getMe: (token?: string) => apiFetch<UserInfo>("/auth/me", { token }),

  get2FAStatus: () => apiFetch<Status2FAResponse>("/auth/2fa/status"),

  enable2FA: () =>
    apiFetch<Enable2FAResponse>("/auth/2fa/enable", { method: "POST" }),

  disable2FA: (code_2fa?: string) =>
    apiFetch<{ success: boolean; message: string }>("/auth/2fa/disable", {
      method: "POST",
      body: { code_2fa },
    }),
};

// ─── Register ──────────────────────────────────────────────────────────────

export const registerAPI = {
  agent: (data: AgentOfficielCreate) =>
    apiFetch<APIResponse>("/register/agent", { method: "POST", body: data }),

  admin: (data: AdminCreate) =>
    apiFetch<APIResponse>("/register/admin", { method: "POST", body: data }),

  citoyen: (data: CitoyenCreate) =>
    apiFetch<APIResponse>("/register/citoyen", { method: "POST", body: data }),
};

// ─── Keys ──────────────────────────────────────────────────────────────────

export const keysAPI = {
  generate: () =>
    apiFetch<CryptographicKey>("/keys/generate", { method: "POST" }),

  renew: () => apiFetch<CryptographicKey>("/keys/renew", { method: "POST" }),

  myKeys: () => apiFetch<CryptographicKey[]>("/keys/my-keys"),
};

// ─── Signatures ────────────────────────────────────────────────────────────

export const signaturesAPI = {
  sign: (data: SignRequest) =>
    apiFetch<SignResponse>("/signatures/sign", { method: "POST", body: data }),

  verify: (data: VerifyRequest) =>
    apiFetch<VerifyResponse>("/signatures/verify", {
      method: "POST",
      body: data,
    }),

  validate: (communique_id: string) =>
    apiFetch<IntegrityResponse>(`/signatures/validate/${communique_id}`),

  mySignatures: (limit = 50, offset = 0) =>
    apiFetch<SignatureListItem[]>(
      `/signatures/my-signatures?limit=${limit}&offset=${offset}`
    ),

  pending: () => apiFetch<Record<string, unknown>[]>("/signatures/pending"),

  stats: () => apiFetch<Record<string, unknown>>("/signatures/stats"),
};

// ─── Search ────────────────────────────────────────────────────────────────

export const searchAPI = {
  simple: (q: string, page = 1, limit = 20) =>
    apiFetch<SearchResponse>(
      `/search/simple?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
    ),

  suggestions: (q: string, limit = 5) =>
    apiFetch<{ query: string; suggestions: string[] }>(
      `/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`
    ),


  popular: (limit = 10) =>
    apiFetch<SimpleListResponse>(`/search/popular?limit=${limit}`),

  recent: (limit = 10) =>
    apiFetch<SimpleListResponse>(`/search/recent?limit=${limit}`),

};

// ─── OCR ───────────────────────────────────────────────────────────────────

export const ocrAPI = {
  extract: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<OCRResponse>("/ocr/extract", {
      method: "POST",
      formData: fd,
    });
  },
};
