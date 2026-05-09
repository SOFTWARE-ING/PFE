import React, { useState, useEffect, useCallback } from "react";
import {
  FileSignature,
  CheckCircle,
  XCircle,
  Search,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Alert";
import { Alert } from "../../components/ui/Alert";
import { Input } from "../../components/ui/Input";
import { signaturesAPI } from "../../services/api";
import type { SignatureListItem } from "../../types";

function SignatureRow({ sig }: { sig: SignatureListItem }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div
        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          sig.est_valide
            ? "bg-emerald-50 dark:bg-emerald-950"
            : "bg-rose-50 dark:bg-rose-950"
        }`}
      >
        {sig.est_valide ? (
          <CheckCircle
            size={16}
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {sig.titre_communique}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {sig.id_signature.slice(0, 12)}…
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {new Date(sig.date_signature).toLocaleString("fr-FR")}
          </span>
        </div>
      </div>
      <Badge variant={sig.est_valide ? "success" : "danger"}>
        {sig.est_valide ? "Valide" : "Invalide"}
      </Badge>
    </div>
  );
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<SignatureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sign form
  const [signId, setSignId] = useState("");
  const [signComment, setSignComment] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [signResult, setSignResult] = useState<string>("");
  const [signError, setSignError] = useState("");

  // Verify form
  const [verifId, setVerifId] = useState("");
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifResult, setVerifResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await signaturesAPI.mySignatures();
      setSignatures(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignatures();
  }, [loadSignatures]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signId.trim()) return;
    setSignLoading(true);
    setSignResult("");
    setSignError("");
    try {
      const res = await signaturesAPI.sign({
        communique_id: signId.trim(),
        commentaire: signComment || undefined,
      });
      setSignResult(res.message);
      setSignId("");
      setSignComment("");
      void loadSignatures();
    } catch (err: unknown) {
      setSignError(err instanceof Error ? err.message : "Erreur de signature");
    } finally {
      setSignLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifId.trim()) return;
    setVerifLoading(true);
    setVerifResult(null);
    try {
      const res = await signaturesAPI.verify({ signature_id: verifId.trim() });
      setVerifResult({ verified: res.verified ?? false, message: res.message });
    } catch (err: unknown) {
      setVerifResult({
        verified: false,
        message: err instanceof Error ? err.message : "Erreur de vérification",
      });
    } finally {
      setVerifLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Signatures numériques
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Signez des communiqués et vérifiez leur authenticité
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Sign a document */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileSignature
              size={18}
              className="text-indigo-600 dark:text-indigo-400"
            />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Signer un communiqué
            </h2>
          </div>
          <form onSubmit={(e) => void handleSign(e)} className="space-y-3">
            <Input
              label="ID du communiqué (UUID)"
              value={signId}
              onChange={(e) => setSignId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="UUID du communiqué à signer"
            />
            <Input
              label="Commentaire (optionnel)"
              value={signComment}
              onChange={(e) => setSignComment(e.target.value)}
              placeholder="Remarque…"
            />
            {signResult && <Alert variant="success" message={signResult} />}
            {signError && <Alert variant="error" message={signError} />}
            <Button
              type="submit"
              loading={signLoading}
              icon={<FileSignature size={15} />}
              className="w-full"
            >
              Apposer la signature
            </Button>
          </form>
        </Card>

        {/* Verify a signature */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck
              size={18}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Vérifier une signature
            </h2>
          </div>
          <form onSubmit={(e) => void handleVerify(e)} className="space-y-3">
            <Input
              label="ID de la signature (UUID)"
              value={verifId}
              onChange={(e) => setVerifId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            {verifResult !== null && (
              <Alert
                variant={verifResult.verified ? "success" : "error"}
                message={verifResult.message}
              />
            )}
            <Button
              type="submit"
              loading={verifLoading}
              icon={<Search size={15} />}
              className="w-full"
              variant="secondary"
            >
              Vérifier
            </Button>
          </form>
        </Card>
      </div>

      {/* My signatures list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Mes signatures ({signatures.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadSignatures()}
            icon={<RefreshCw size={14} />}
          >
            Actualiser
          </Button>
        </div>

        {error && <Alert variant="error" message={error} className="mb-4" />}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              size={20}
              className="animate-spin text-indigo-500 dark:text-indigo-400"
            />
          </div>
        ) : signatures.length === 0 ? (
          <div className="py-12 text-center">
            <FileSignature
              size={32}
              className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune signature enregistrée.
            </p>
          </div>
        ) : (
          <div>
            {signatures.map((sig) => (
              <SignatureRow key={sig.id_signature} sig={sig} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
