// pages/dashboard/Admin/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, ShieldCheck, UserCheck, UserX, Smartphone,
  Activity, RefreshCw, TrendingUp,
} from "lucide-react";
import { adminAPI } from "../../../services/api";
import type { AdminStats } from "../../../types";

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: number;
  color: string; sub?: string;
}> = ({ icon, label, value, color, sub }) => (
  <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-600 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-dark-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminAPI.getStats();
      setStats(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">Vue d'ensemble de la plateforme SHIELD</p>
        </div>
        <button onClick={loadStats} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 text-sm font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-200 dark:hover:bg-dark-600 transition disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-dark-700 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={20} className="text-blue-600" />}
              label="Utilisateurs" value={stats.utilisateurs.total}
              color="bg-blue-50 dark:bg-blue-950/30" />
            <StatCard icon={<ShieldCheck size={20} className="text-army-600" />}
              label="Agents Officiels" value={stats.utilisateurs.agents}
              color="bg-army-50 dark:bg-army-950/30" />
            <StatCard icon={<UserCheck size={20} className="text-purple-600" />}
              label="Administrateurs" value={stats.utilisateurs.admins}
              color="bg-purple-50 dark:bg-purple-950/30" />
            <StatCard icon={<Users size={20} className="text-sky-600" />}
              label="Citoyens" value={stats.utilisateurs.citoyens}
              color="bg-sky-50 dark:bg-sky-950/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<UserX size={20} className="text-red-500" />}
              label="Comptes bloqués" value={stats.utilisateurs.bloques}
              color="bg-red-50 dark:bg-red-950/30"
              sub="token_autorise = false" />
            <StatCard icon={<Smartphone size={20} className="text-emerald-600" />}
              label="Comptes avec 2FA" value={stats.utilisateurs.avec_2fa}
              color="bg-emerald-50 dark:bg-emerald-950/30" />
            <StatCard icon={<Activity size={20} className="text-amber-600" />}
              label="Sessions actives" value={stats.utilisateurs.sessions_actives}
              color="bg-amber-50 dark:bg-amber-950/30"
              sub="Connectés en ce moment" />
          </div>

          {/* Actions rapides */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-6">
            <h2 className="text-sm font-bold text-gray-700 dark:text-dark-200 uppercase tracking-wide mb-4">
              Actions rapides
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Créer un agent",   icon: <UserCheck size={16} />,  path: "/dashboard/admin/users?action=create-agent",  color: "bg-army-600 hover:bg-army-700"    },
                { label: "Créer un admin",   icon: <ShieldCheck size={16} />, path: "/dashboard/admin/users?action=create-admin",  color: "bg-purple-600 hover:bg-purple-700" },
                { label: "Gérer les comptes",icon: <Users size={16} />,       path: "/dashboard/admin/users",                       color: "bg-blue-600 hover:bg-blue-700"     },
                { label: "Voir les logs",    icon: <TrendingUp size={16} />,  path: "/dashboard/admin/logs",                        color: "bg-gray-700 hover:bg-gray-800"     },
              ].map((a) => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium transition ${a.color}`}>
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
