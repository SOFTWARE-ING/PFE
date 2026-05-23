// types/index.ts — Types TypeScript SHIELD v3

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface LoginFormData {
  email: string;
  mot_de_passe: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: "bearer" | "temp";
  id_utilisateur: string;
  requires_2fa: boolean;
}

export interface Verify2FARequest {
  temp_token: string;
  code_2fa: string;
  use_email: boolean;
}

export interface Verify2FAResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: "bearer";
  id_utilisateur: string;
  expires_in: number;
}

export interface UserInfo {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  has_2fa: boolean;
  date_creation: string;
}

export type OTPCode = string[];

// ─── Register ──────────────────────────────────────────────────────────────

export interface AgentOfficielCreate {
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom: string;
  id_institution: string;
  fonction: string;
  departement?: string;
  matricule?: string;
}

export interface AdminCreate {
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom: string;
  niveau_habilitation?: string;
}

export interface CitoyenCreate {
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom: string;
  id_session?: string;
  ip_adresse?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── Keys ──────────────────────────────────────────────────────────────────

export interface CryptographicKey {
  id_cle: string;
  cle_publique: string;
  date_creation: string;
  date_expiration: string;
  success?: boolean;
  message?: string;
}

// ─── Signatures ────────────────────────────────────────────────────────────

export interface SignRequest {
  communique_id: string;
}

export interface SignResponse {
  success: boolean;
  signature_id: string;
  communique_id: string;
  qr_code?: string;
  message: string;
}

export interface VerifyRequest {
  signature_id: string;
}

export interface VerifyResponse {
  success: boolean;
  is_valid: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface IntegrityResponse {
  success: boolean;
  communique_id: string;
  is_valid: boolean;
  signatures_count: number;
  details: Record<string, unknown>;
}

export interface SignatureListItem {
  id_signature: string;
  id_communique: string;
  titre_communique?: string;
  date_signature: string;
  est_valide: boolean;
  algorithme_hachage: string;
}

// ─── Documents ─────────────────────────────────────────────────────────────

export interface UploadResponse {
  success: boolean;
  communique_id: string;
  titre: string;
  contenu_extrait?: string;
  message: string;
}

export interface FinalizeResponse {
  success: boolean;
  communique_id: string;
  file_path: string;
  file_size: number;
  message: string;
}

export interface MyDocument {
  id_communique: string;
  titre: string;
  statut: string;
  est_archive: boolean;
  date_creation: string;
  date_publication?: string;
  fichier_signe?: string;
}

export interface MyDocumentsResponse {
  success: boolean;
  total: number;
  documents: MyDocument[];
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface SearchResult {
  id_communique: string;
  titre: string;
  extrait?: string;
  score?: number;
  statut: string;
  date_publication: string;
}

export interface SearchResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  results: SearchResult[];
}

export interface SimpleListResponse {
  success: boolean;
  total: number;
  results: {
    id: string;
    titre: string;
    statut: string;
    date_publication: string;
    nb_consultations?: number;
  }[];
}

// ─── OCR ───────────────────────────────────────────────────────────────────

export interface OCRResponse {
  success: boolean;
  filename: string;
  text: string;
  language?: string;
  word_count?: number;
}

// ─── 2FA ───────────────────────────────────────────────────────────────────

export interface Enable2FAResponse {
  success: boolean;
  secret: string;
  qr_code: string;
  message: string;
}

export interface Status2FAResponse {
  enabled: boolean;
  activated_at?: string;
}

// ─── Admin — Utilisateurs ──────────────────────────────────────────────────

export interface AdminUser {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
  role: "agent_officiel" | "administrateur" | "citoyen" | "inconnu";
  niveau_habilitation?: string;
  token_autorise: boolean;
  deux_fa_actif: boolean;
  deux_fa_force: boolean;
  session_active: boolean;
  derniere_connexion: string | null;
  date_creation: string;
  is_protected: boolean; // SUPER_ADMIN — ne peut pas être modifié
}

export interface AdminUsersResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  users: AdminUser[];
}

// ─── Admin — Logs ──────────────────────────────────────────────────────────

export interface LogEntry {
  id_log: string;
  id_utilisateur: string;
  user_email: string;
  user_nom: string;
  type_action: string;
  date_action: string;
  succes: boolean;
  details: string | null;
  ip_adresse: string | null;
}

export interface AdminLogsResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  logs: LogEntry[];
}

// ─── Admin — Stats ─────────────────────────────────────────────────────────

export interface AdminStats {
  utilisateurs: {
    total: number;
    agents: number;
    admins: number;
    citoyens: number;
    bloques: number;
    avec_2fa: number;
    sessions_actives: number;
  };
}

// ─── Admin — Sessions ──────────────────────────────────────────────────────

export interface ActiveSession {
  id_utilisateur: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  derniere_connexion: string | null;
}

// ─── Password Reset ────────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}
