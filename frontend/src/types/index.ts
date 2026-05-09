// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Register ─────────────────────────────────────────────────────────────────

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

// ─── Keys ─────────────────────────────────────────────────────────────────────

export interface CryptographicKey {
  id_cle: string;
  id_agent_officiel: string;
  algorithme: string;
  cle_publique: string;
  date_creation: string;
  date_expiration?: string;
  est_active: boolean;
}

// ─── Signatures ───────────────────────────────────────────────────────────────

export interface SignatureListItem {
  id_signature: string;
  id_communique: string;
  titre_communique: string;
  date_signature: string;
  est_valide: boolean;
  algorithme: string;
}

export interface SignRequest {
  communique_id: string;
  commentaire?: string;
}

export interface SignResponse {
  success: boolean;
  message: string;
  signature_id?: string;
  signature_value?: string;
  hash_document?: string;
  timestamp?: string;
  verified?: boolean;
}

export interface VerifyRequest {
  signature_id: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  signature_id?: string;
  verified?: boolean;
  hash_document?: string;
  details?: string;
}

export interface IntegrityResponse {
  communique_id: string;
  titre: string;
  statut: string;
  total_signatures: number;
  valid_signatures: number;
  integrity_verified: boolean;
  details: Record<string, unknown>[];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface Communique {
  id_communique: string;
  titre: string;
  contenu?: string;
  statut: string;
  date_publication: string;
  auteur?: string;
}

export interface SearchResult {
  communique: Communique;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  limit: number;
  results: SearchResult[];
}

// ─── OCR ──────────────────────────────────────────────────────────────────────

export interface OCRResponse {
  filname: string;
  extracted_text: string;
  message: string;
}

// ─── 2FA management ───────────────────────────────────────────────────────────

export interface Enable2FAResponse {
  success: boolean;
  message: string;
  secret: string;
  qr_code: string;
}

export interface Status2FAResponse {
  enabled: boolean;
  activated_at?: string;
}
