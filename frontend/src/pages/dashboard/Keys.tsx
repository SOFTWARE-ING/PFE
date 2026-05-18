import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Alert";
import { Alert } from "../../components/ui/Alert";
import { keysAPI } from "../../services/api";
import type { CryptographicKey } from "../../types";

type CryptographicKeyWithAlgorithm = CryptographicKey & {
  algorithme?: string;
};

function getKeyAlgorithm(key: CryptographicKey) {
  return (key as CryptographicKeyWithAlgorithm).algorithme ?? "RSA";
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={() => void handleCopy()}
      title="Copier la clé publique"
      className="p-1.5 rounded-md text-army-400 hover:text-army-600 dark:hover:text-army-300 hover:bg-army-100 dark:hover:bg-army-800 transition-colors"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

function isKeyActive(k: CryptographicKey) {
  const isExpired = k.date_expiration
    ? new Date(k.date_expiration) < new Date()
    : false;

  return k.est_expiree === true ? false : !isExpired;
}

function KeyCard({ k }: { k: CryptographicKey }) {
  const isExpired = k.date_expiration
    ? new Date(k.date_expiration) < new Date()
    : false;
  const isActive = isKeyActive(k);

  return (
    <div className="border border-army-200 dark:border-army-800 rounded-xl p-4 bg-white dark:bg-army-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isActive && !isExpired
                ? "bg-emerald-50 dark:bg-emerald-950"
                : "bg-army-100 dark:bg-army-800"
            }`}
          >
            {isActive && !isExpired ? (
              <CheckCircle
                size={18}
                className="text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <XCircle
                size={18}
                className="text-army-400 dark:text-army-600"
              />
            )}
          </div>
          <div>
            <p className="text-xs font-mono text-army-600 dark:text-army-400">
              {k.id_cle.slice(0, 16)}…
            </p>
            <p className="text-[11px] text-army-400 dark:text-army-500 mt-0.5">
              {getKeyAlgorithm(k)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isActive && !isExpired ? "success" : "neutral"}>
            {isActive && !isExpired ? "Active" : isExpired ? "Expirée" : "Inactive"}
          </Badge>
          <CopyButton value={k.cle_publique} />
        </div>
      </div>

      <div className="mt-3 p-3 rounded-lg bg-army-50 dark:bg-army-800/60 border border-army-100 dark:border-army-700">
        <p className="text-[10px] text-army-400 dark:text-army-500 mb-1 font-medium uppercase tracking-wide">
          Clé publique
        </p>
        <p className="text-[10px] font-mono text-army-600 dark:text-army-400 break-all leading-relaxed line-clamp-3">
          {k.cle_publique}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-army-400 dark:text-army-500">
        <span>
          Créée le{" "}
          {new Date(k.date_creation).toLocaleDateString("fr-FR")}
        </span>
        {k.date_expiration && (
          <span className={isExpired ? "text-rose-500" : ""}>
            Expire le{" "}
            {new Date(k.date_expiration).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KeysPage() {
  const [keys, setKeys] = useState<CryptographicKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState("");
  const [actionError, setActionError] = useState("");

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await keysAPI.myKeys();
      setKeys(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleGenerate = async () => {
    setActionLoading(true);
    setActionResult("");
    setActionError("");
    try {
      await keysAPI.generate();
      setActionResult("Nouvelle paire de clés RSA générée avec succès.");
      void loadKeys();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Erreur lors de la génération"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    setActionResult("");
    setActionError("");
    try {
      await keysAPI.renew();
      setActionResult("Clés renouvelées avec succès.");
      void loadKeys();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Erreur lors du renouvellement"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const activeKey = keys.find(isKeyActive);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-army-900 dark:text-army-50">
          Clés cryptographiques
        </h1>
        <p className="text-sm text-army-500 dark:text-army-400 mt-0.5">
          Gérez votre paire de clés RSA pour la signature de documents
        </p>
      </div>

      {/* Status summary */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              activeKey
                ? "bg-emerald-50 dark:bg-emerald-950"
                : "bg-amber-50 dark:bg-amber-950"
            }`}
          >
            <Key
              size={22}
              className={
                activeKey
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-army-800 dark:text-army-200">
              {activeKey ? "Clé active disponible" : "Aucune clé active"}
            </p>
            <p className="text-xs text-army-500 dark:text-army-400 mt-0.5">
              {activeKey
                ? `Algorithme : ${getKeyAlgorithm(activeKey)}`
                : "Générez une nouvelle paire de clés pour pouvoir signer des documents"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              loading={actionLoading}
              onClick={() => void handleRenew()}
              disabled={!activeKey}
            >
              Renouveler
            </Button>
            <Button
              size="sm"
              icon={<Plus size={14} />}
              loading={actionLoading}
              onClick={() => void handleGenerate()}
            >
              Générer
            </Button>
          </div>
        </div>

        {actionResult && (
          <Alert variant="success" message={actionResult} className="mt-4" />
        )}
        {actionError && (
          <Alert variant="error" message={actionError} className="mt-4" />
        )}
      </Card>

      {/* Keys list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-army-800 dark:text-army-200">
            Historique des clés ({keys.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => void loadKeys()}
          >
            Actualiser
          </Button>
        </div>

        {error && <Alert variant="error" message={error} className="mb-4" />}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              size={20}
              className="animate-spin text-army-600 dark:text-army-600"
            />
          </div>
        ) : keys.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <Key
                size={32}
                className="mx-auto text-army-300 dark:text-army-700 mb-3"
              />
              <p className="text-sm text-army-500 dark:text-army-400">
                Aucune clé générée. Cliquez sur « Générer » pour commencer.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <KeyCard key={k.id_cle} k={k} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
