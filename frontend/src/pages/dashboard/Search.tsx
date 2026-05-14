import React, { useState, useCallback, useRef } from "react";
import {
  Search,
  FileText,
  CalendarDays,
  Clock,
  TrendingUp,
  Download,
  Loader2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Alert";
import { Alert } from "../../components/ui/Alert";
import { searchAPI } from "../../services/api";
import type { SearchResponse, SearchResult } from "../../types";

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, "success" | "info" | "warning" | "neutral"> = {
    publie: "success",
    brouillon: "warning",
    archive: "neutral",
  };
  const labels: Record<string, string> = {
    publie: "Publié",
    brouillon: "Brouillon",
    archive: "Archivé",
  };
  return (
    <Badge variant={map[statut.toLowerCase()] ?? "neutral"}>
      {labels[statut.toLowerCase()] ?? statut}
    </Badge>
  );
}

// function ResultCard({ result }: { result: SearchResult }) {
//   const { communique, score } = result;
//   return (
//     <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
//       <div className="flex items-start justify-between gap-3">
//         <div className="flex items-center gap-2 min-w-0">
//           <FileText
//             size={16}
//             className="text-indigo-500 dark:text-indigo-400 shrink-0"
//           />
//           <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
//             {communique.titre}
//           </h3>
//         </div>
//         <div className="flex items-center gap-2 shrink-0">
//           <StatusBadge statut={communique.statut} />
//           <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
//             #{score}
//           </span>
//         </div>
//       </div>

//       {communique.contenu && (
//         <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
//           {communique.contenu}
//         </p>
//       )}

//       <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
//         {communique.date_publication && (
//           <span className="flex items-center gap-1">
//             <CalendarDays size={11} />
//             {new Date(communique.date_publication).toLocaleDateString("fr-FR")}
//           </span>
//         )}
//         {communique.auteur && (
//           <span className="truncate">{communique.auteur}</span>
//         )}
//         <span className="font-mono text-[10px]">
//           {communique.id_communique.slice(0, 8)}…
//         </span>
//       </div>
//     </div>
//   );
// }

function ResultCard({ result }: { result: SearchResult }) {
  const { communique, score } = result;
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
            {communique.titre}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge statut={communique.statut} />
          <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
            #{score}
          </span>
        </div>
      </div>

      {communique.contenu && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {communique.contenu}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
          {communique.date_publication && (
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(communique.date_publication).toLocaleDateString("fr-FR")}
            </span>
          )}
          {communique.auteur && <span className="truncate">{communique.auteur}</span>}
          <span className="font-mono text-[10px]">{communique.id_communique.slice(0, 8)}…</span>
        </div>
        <a
          href={`http://127.0.0.1:8000/api/documents/${communique.id_communique}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0 font-medium"
        >
          <Download size={11} />
          Télécharger PDF
        </a>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (q: string, p = 1) => {
      if (!q.trim()) return;
      if (abortRef.current) abortRef.current.abort();

      setLoading(true);
      setError("");

      try {
        const data = await searchAPI.simple(q.trim(), p);
        setResult(data);
        setPage(p);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query, 1);
  };

  const totalPages = result ? Math.ceil(result.total / result.limit) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Recherche de communiqués
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Parcourez les communiqués officiels publiés
        </p>
      </div>

      {/* Search bar */}
      <Card padding="sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un communiqué…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <Button type="submit" loading={loading} icon={<Search size={15} />}>
            Rechercher
          </Button>
        </form>
      </Card>

      {/* Quick links */}
      {!result && !loading && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void runSearch("communiqué", 1)}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-left"
          >
            <TrendingUp
              size={18}
              className="text-indigo-500 dark:text-indigo-400"
            />
            <div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Populaires
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Les plus consultés
              </p>
            </div>
          </button>
          <button
            onClick={() => void runSearch("récent", 1)}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-left"
          >
            <Clock
              size={18}
              className="text-emerald-500 dark:text-emerald-400"
            />
            <div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Récents
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Dernières publications
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Error */}
      {error && <Alert variant="error" message={error} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2
            size={24}
            className="animate-spin text-indigo-500 dark:text-indigo-400"
          />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {result.total} résultat{result.total !== 1 ? "s" : ""} pour «{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {result.query}
              </span>{" "}
              »
            </p>
            {totalPages > 1 && (
              <p className="text-xs text-slate-400">
                Page {page} / {totalPages}
              </p>
            )}
          </div>

          {result.results.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <FileText
                  size={32}
                  className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucun résultat pour cette recherche.
                </p>
              </div>
            </Card>
          ) : (
            result.results.map((r) => (
              <ResultCard key={r.communique.id_communique} result={r} />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => void runSearch(query, page - 1)}
              >
                Précédent
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => void runSearch(query, page + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
