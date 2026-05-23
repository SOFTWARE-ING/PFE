// pages/dashboard/Admin/AdminUsers.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, UserPlus, RefreshCw, Shield, ShieldOff, Smartphone,
  SmartphoneNfc, KeyRound, ChevronLeft, ChevronRight, X,
  CheckCircle, AlertTriangle, Users, Eye,
} from "lucide-react";
import { adminAPI } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import type { AdminUser } from "../../../types";

// ── Badge rôle ───────────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string; niveau?: string }> = ({ role, niveau }) => {
  const map: Record<string, string> = {
    agent_officiel:  "bg-army-100 text-army-700 dark:bg-army-950/40 dark:text-army-400",
    administrateur:  "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    citoyen:         "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  };
  const label = niveau ?? role.replace("_", " ");
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[role] ?? "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
};

// ── Modal création agent ──────────────────────────────────────────────────────

const CreateAgentModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", id_institution: "", fonction: "", departement: "", matricule: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminAPI.createAgent(form);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur création agent");
    } finally {
      setLoading(false);
    }
  };

  const Field: React.FC<{ label: string; name: keyof typeof form; required?: boolean; placeholder?: string }> = ({ label, name, required, placeholder }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        value={form[name]} onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
        required={required} placeholder={placeholder ?? ""}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500 transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Créer un Agent Officiel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" name="prenom" required placeholder="Jean" />
            <Field label="Nom" name="nom" required placeholder="Dupont" />
          </div>
          <Field label="Email" name="email" required placeholder="jean.dupont@gouv.cm" />
          <Field label="Institution" name="id_institution" required placeholder="MINCOM" />
          <Field label="Fonction" name="fonction" required placeholder="Directeur de la communication" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Département" name="departement" placeholder="Communication" />
            <Field label="Matricule" name="matricule" placeholder="MAT-0001" />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            ℹ️ Le token d'accès sera <strong>désactivé par défaut</strong>. Le 2FA sera activé automatiquement.
            Les identifiants seront envoyés par email à l'agent.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-500 text-sm font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-army-600 text-white text-sm font-semibold hover:bg-army-700 disabled:opacity-50 transition">
              {loading ? "Création…" : "Créer l'agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal création admin ─────────────────────────────────────────────────────

const CreateAdminModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", niveau_habilitation: "ADMIN_SYSTEME" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminAPI.createAdmin(form);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur création admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Créer un Administrateur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1 uppercase tracking-wide">Prénom *</label>
              <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1 uppercase tracking-wide">Nom *</label>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1 uppercase tracking-wide">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1 uppercase tracking-wide">Niveau d'habilitation *</label>
            <select value={form.niveau_habilitation} onChange={e => setForm(f => ({ ...f, niveau_habilitation: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500">
              <option value="ADMIN_SYSTEME">ADMIN_SYSTEME</option>
              <option value="ADMIN_SECURITE">ADMIN_SECURITE</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-500 text-sm font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition">
              {loading ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = user?.role === "administrateur"; // raffiné via niveau en pratique

  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tokenFilter, setTokenFilter] = useState<"" | "true" | "false">("");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const LIMIT = 15;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (tokenFilter !== "") params.token_autorise = tokenFilter === "true";
      const res = await adminAPI.listUsers(params as Parameters<typeof adminAPI.listUsers>[0]);
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, tokenFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Ouvrir modal depuis query param (venant du dashboard)
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "create-agent") setShowCreateAgent(true);
    if (action === "create-admin") setShowCreateAdmin(true);
  }, [searchParams]);

  const handleToggleAccess = async (u: AdminUser) => {
    if (u.is_protected) { showToast("Impossible de modifier un SUPER_ADMIN.", false); return; }
    setActionLoading(`access-${u.id_utilisateur}`);
    try {
      const res = await adminAPI.toggleAccess(u.id_utilisateur);
      showToast(res.message);
      loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle2FA = async (u: AdminUser) => {
    if (u.is_protected) { showToast("Impossible de modifier un SUPER_ADMIN.", false); return; }
    setActionLoading(`2fa-${u.id_utilisateur}`);
    try {
      const res = await adminAPI.toggle2FA(u.id_utilisateur);
      showToast(res.message);
      loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPwd = async (u: AdminUser) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.prenom} ${u.nom} ?`)) return;
    setActionLoading(`pwd-${u.id_utilisateur}`);
    try {
      const res = await adminAPI.resetPassword(u.id_utilisateur);
      showToast(res.message);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur", false);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showCreateAgent && <CreateAgentModal onClose={() => setShowCreateAgent(false)} onSuccess={() => { loadUsers(); showToast("Agent créé avec succès !"); }} />}
      {showCreateAdmin && <CreateAdminModal onClose={() => setShowCreateAdmin(false)} onSuccess={() => { loadUsers(); showToast("Administrateur créé !"); }} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">
            {total} utilisateur{total > 1 ? "s" : ""} au total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateAgent(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-army-600 text-white text-sm font-semibold hover:bg-army-700 transition shadow-sm">
            <UserPlus size={14} />Agent
          </button>
          <button onClick={() => setShowCreateAdmin(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition shadow-sm">
            <UserPlus size={14} />Admin
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher nom, prénom, email…"
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500 transition"
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500">
            <option value="">Tous les rôles</option>
            <option value="agent_officiel">Agent Officiel</option>
            <option value="administrateur">Administrateur</option>
            <option value="citoyen">Citoyen</option>
          </select>
          <select value={tokenFilter} onChange={(e) => { setTokenFilter(e.target.value as "" | "true" | "false"); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500">
            <option value="">Tous les accès</option>
            <option value="true">Accès autorisé</option>
            <option value="false">Accès bloqué</option>
          </select>
          <button onClick={loadUsers} disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-dark-500 text-gray-500 dark:text-dark-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Session</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Accès</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">2FA</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-dark-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-gray-100 dark:bg-dark-700 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-dark-500">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isLoading = (k: string) => actionLoading === `${k}-${u.id_utilisateur}`;
                  return (
                    <tr key={u.id_utilisateur}
                      className="border-b border-gray-50 dark:border-dark-700 hover:bg-gray-50/50 dark:hover:bg-dark-700/50 transition">
                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-dark-100">{u.prenom} {u.nom}</p>
                          <p className="text-xs text-gray-500 dark:text-dark-400">{u.email}</p>
                        </div>
                      </td>
                      {/* Rôle */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} niveau={u.niveau_habilitation} />
                      </td>
                      {/* Session */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.session_active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-dark-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.session_active ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-dark-500"}`} />
                          {u.session_active ? "Active" : "Inactive"}
                        </span>
                        {u.derniere_connexion && (
                          <p className="text-[10px] text-gray-400 dark:text-dark-500 mt-0.5">
                            {new Date(u.derniere_connexion).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </td>
                      {/* Toggle accès */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAccess(u)}
                          disabled={u.is_protected || !!actionLoading}
                          title={u.is_protected ? "SUPER_ADMIN protégé" : u.token_autorise ? "Bloquer l'accès" : "Autoriser l'accès"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            u.is_protected
                              ? "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-dark-700 text-gray-400"
                              : u.token_autorise
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 hover:bg-emerald-100 hover:text-emerald-700"
                          }`}
                        >
                          {isLoading("access") ? <RefreshCw size={12} className="animate-spin" /> : u.token_autorise ? <Shield size={12} /> : <ShieldOff size={12} />}
                          {u.token_autorise ? "Autorisé" : "Bloqué"}
                        </button>
                      </td>
                      {/* Toggle 2FA */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle2FA(u)}
                          disabled={u.is_protected || !!actionLoading}
                          title={u.is_protected ? "SUPER_ADMIN protégé" : u.deux_fa_actif ? "Désactiver le 2FA" : "Activer le 2FA"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            u.is_protected
                              ? "opacity-30 cursor-not-allowed bg-gray-100 dark:bg-dark-700 text-gray-400"
                              : u.deux_fa_actif
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-gray-100 hover:text-gray-600"
                                : "bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-dark-400 hover:bg-blue-100 hover:text-blue-700"
                          }`}
                        >
                          {isLoading("2fa") ? <RefreshCw size={12} className="animate-spin" /> : u.deux_fa_actif ? <SmartphoneNfc size={12} /> : <Smartphone size={12} />}
                          {u.deux_fa_actif ? "Actif" : "Inactif"}
                        </button>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleResetPwd(u)}
                            disabled={u.is_protected || !!actionLoading}
                            title="Réinitialiser le mot de passe"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            {isLoading("pwd") ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                          </button>
                          <button title="Voir le profil"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition">
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Page {page} / {totalPages} — {total} résultat{total > 1 ? "s" : ""}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-600 disabled:opacity-30 transition">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-600 disabled:opacity-30 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
