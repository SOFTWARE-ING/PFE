// pages/dashboard/Admin/AdminSessions.tsx
import React, { useEffect, useState } from "react";
import { Activity, RefreshCw, Users } from "lucide-react";
import { adminAPI } from "../../../services/api";
import type { ActiveSession } from "../../../types";

const AdminSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await adminAPI.activeSessions();
      setSessions(res.sessions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const ROLE_LABELS: Record<string, string> = {
    agent_officiel: "Agent Officiel",
    administrateur: "Administrateur",
    citoyen: "Citoyen",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions actives</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">
            {sessions.length} utilisateur{sessions.length > 1 ? "s" : ""} connecté{sessions.length > 1 ? "s" : ""} en ce moment
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 text-sm font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-200 dark:hover:bg-dark-600 transition disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Actualiser
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-dark-700 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-500">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune session active en ce moment</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                {["Utilisateur", "Rôle", "Dernière activité"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id_utilisateur} className="border-b border-gray-50 dark:border-dark-700 hover:bg-gray-50/50 dark:hover:bg-dark-700/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-dark-100">{s.prenom} {s.nom}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-army-100 text-army-700 dark:bg-army-950/40 dark:text-army-400">
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400">
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} className="text-emerald-500" />
                      {s.derniere_connexion
                        ? new Date(s.derniere_connexion).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminSessions;
