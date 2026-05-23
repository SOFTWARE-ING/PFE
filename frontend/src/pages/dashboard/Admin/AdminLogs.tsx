// pages/dashboard/Admin/AdminLogs.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { adminAPI } from "../../../services/api";
import type { LogEntry } from "../../../types";

const ACTION_COLORS: Record<string, string> = {
  CONNEXION:              "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  DECONNEXION:            "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300",
  CREATION_AGENT:         "bg-army-100 text-army-700 dark:bg-army-950/40 dark:text-army-400",
  CREATION_ADMIN:         "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  BLOCAGE_TOKEN:          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  AUTORISATION_TOKEN:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  ADMIN_ENABLE_2FA:       "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
  ADMIN_DISABLE_2FA:      "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  PASSWORD_RESET_REQUEST: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  PASSWORD_RESET_SUCCESS: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  SIGNATURE_COMMUNIQUE:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
};

const AdminLogs: React.FC = () => {
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [actionFilter, setAction] = useState("");
  const [succesFilter, setSucces] = useState<"" | "true" | "false">("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const LIMIT = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params: Parameters<typeof adminAPI.getLogs>[0] = { page, limit: LIMIT };
      if (search)              params.user_id = undefined; // search is over email in practice
      if (actionFilter)        params.action  = actionFilter;
      if (succesFilter !== "") params.succes  = succesFilter === "true";
      const res = await adminAPI.getLogs(params);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur chargement logs");
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, succesFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal d'audit</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">{total} entrée{total > 1 ? "s" : ""} au total</p>
        </div>
        <button onClick={loadLogs} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 text-sm font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-200 dark:hover:bg-dark-600 transition disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par utilisateur…"
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500 transition" />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={actionFilter} onChange={e => { setAction(e.target.value); setPage(1); }}
              placeholder="Type d'action…"
              className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500 transition" />
          </div>
          <select value={succesFilter} onChange={e => { setSucces(e.target.value as "" | "true" | "false"); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 focus:outline-none focus:ring-2 focus:ring-army-500">
            <option value="">Tous les statuts</option>
            <option value="true">Succès</option>
            <option value="false">Échec</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                {["Date", "Utilisateur", "Action", "Statut", "Détails", "IP"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-dark-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-gray-100 dark:bg-dark-700 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-dark-500">Aucun log trouvé</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id_log} className="border-b border-gray-50 dark:border-dark-700 hover:bg-gray-50/50 dark:hover:bg-dark-700/50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400 whitespace-nowrap">
                      {new Date(log.date_action).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-dark-100 text-xs">{log.user_nom}</p>
                      <p className="text-[10px] text-gray-400 dark:text-dark-500">{log.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ACTION_COLORS[log.type_action] ?? "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300"}`}>
                        {log.type_action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.succes
                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle size={12} />OK</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium"><XCircle size={12} />Échec</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400 max-w-[200px] truncate" title={log.details ?? ""}>
                      {log.details ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-dark-500 font-mono">
                      {log.ip_adresse ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
            <p className="text-xs text-gray-500 dark:text-dark-400">Page {page} / {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-600 disabled:opacity-30 transition">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-600 disabled:opacity-30 transition">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
