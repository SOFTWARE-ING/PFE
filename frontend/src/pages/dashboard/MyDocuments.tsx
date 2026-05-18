import React, { useEffect, useState } from "react";
import {
  FileText, Download, Archive, Trash2,
  ArchiveRestore, Loader2, RefreshCw, AlertCircle,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { documentsAPI } from "../../services/api";
import type { MyDocument } from "../../services/api";

function StatusPill({ doc }: { doc: MyDocument }) {
  if (doc.est_archive)
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">Archivé</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-medium">Non archivé</span>;
}

export default function MyDocumentsPage() {
  const [docs, setDocs] = useState<MyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const loadDocs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await documentsAPI.myDocuments();
      setDocs(res.documents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDocs(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleArchive = async (doc: MyDocument) => {
    setActionLoading(doc.id_communique);
    try {
      await documentsAPI.archive(doc.id_communique);
      showSuccess(`"${doc.titre}" archivé avec succès.`);
      await loadDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'archivage.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (doc: MyDocument) => {
    setActionLoading(doc.id_communique);
    try {
      await documentsAPI.unarchive(doc.id_communique);
      showSuccess(`"${doc.titre}" retiré de la recherche publique.`);
      await loadDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de désarchivage.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (doc: MyDocument) => {
    if (!window.confirm(`Supprimer définitivement "${doc.titre}" ?`)) return;
    setActionLoading(doc.id_communique);
    try {
      await documentsAPI.delete(doc.id_communique);
      showSuccess(`Document supprimé.`);
      await loadDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de suppression.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-army-900 dark:text-army-50">
            Mes documents
          </h1>
          <p className="text-sm text-army-500 dark:text-army-400 mt-0.5">
            Gérez vos documents signés et leur visibilité publique.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void loadDocs()} icon={<RefreshCw size={14} />}>
          Actualiser
        </Button>
      </div>

      {successMsg && <Alert variant="success" message={successMsg} />}
      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-army-600" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <FileText size={36} className="mx-auto text-army-300 dark:text-army-700 mb-3" />
            <p className="text-sm text-army-500 dark:text-army-400">
              Aucun document signé pour le moment.
            </p>
            <p className="text-xs text-army-400 dark:text-army-500 mt-1">
              Utilisez la page <span className="font-medium">Signer un document</span> pour commencer.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-xs text-army-500 dark:text-army-400 px-1">
            <span>{docs.length} document{docs.length > 1 ? "s" : ""} au total</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {docs.filter((d) => d.est_archive).length} archivé{docs.filter((d) => d.est_archive).length > 1 ? "s" : ""}
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {docs.filter((d) => !d.est_archive).length} non archivé{docs.filter((d) => !d.est_archive).length > 1 ? "s" : ""}
            </span>
          </div>

          {docs.map((doc) => {
            const isActing = actionLoading === doc.id_communique;
            return (
              <div
                key={doc.id_communique}
                className="bg-white dark:bg-army-900 border border-army-200 dark:border-army-800 rounded-xl p-4 hover:border-army-600 dark:hover:border-army-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-army-600 dark:text-army-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-army-800 dark:text-army-200 truncate">
                        {doc.titre}
                      </p>
                      <StatusPill doc={doc} />
                    </div>
                    <p className="text-[11px] text-army-400 dark:text-army-500 mt-1 font-mono">
                      {doc.id_communique.slice(0, 16)}… · {new Date(doc.date_creation).toLocaleDateString("fr-FR")}
                    </p>
                    {!doc.est_archive && (
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                        <AlertCircle size={11} />
                        <span>Non visible dans la recherche publique</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {doc.fichier_signe && (
                      <a
                        href={documentsAPI.downloadUrl(doc.id_communique)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="secondary" icon={<Download size={12} />}>
                          PDF
                        </Button>
                      </a>
                    )}

                    {doc.est_archive ? (
                      <Button
                        size="sm" variant="ghost"
                        icon={isActing ? <Loader2 size={12} className="animate-spin" /> : <ArchiveRestore size={12} />}
                        disabled={isActing}
                        onClick={() => void handleUnarchive(doc)}
                      >
                        Désarchiver
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="ghost"
                        icon={isActing ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                        disabled={isActing}
                        onClick={() => void handleArchive(doc)}
                        className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        Archiver
                      </Button>
                    )}

                    <Button
                      size="sm" variant="ghost"
                      icon={isActing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      disabled={isActing}
                      onClick={() => void handleDelete(doc)}
                      className="text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}