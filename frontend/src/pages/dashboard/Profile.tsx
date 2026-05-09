import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  ShieldOff,
  ShieldCheck,
  Smartphone,
  Mail,
  Loader2,
  QrCode,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Alert";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { Enable2FAResponse, Status2FAResponse } from "../../types";

export default function ProfilePage() {
  const { user } = useAuth();
  const [twoFAStatus, setTwoFAStatus] = useState<Status2FAResponse | null>(
    null
  );
  const [twoFALoading, setTwoFALoading] = useState(true);

  // Enable 2FA
  const [enableResult, setEnableResult] = useState<Enable2FAResponse | null>(
    null
  );
  const [enableLoading, setEnableLoading] = useState(false);
  const [enableError, setEnableError] = useState("");

  // Disable 2FA
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [disableSuccess, setDisableSuccess] = useState("");

  useEffect(() => {
    authAPI
      .get2FAStatus()
      .then(setTwoFAStatus)
      .catch(() => setTwoFAStatus(null))
      .finally(() => setTwoFALoading(false));
  }, []);

  const handleEnable2FA = async () => {
    setEnableLoading(true);
    setEnableError("");
    setEnableResult(null);
    try {
      const res = await authAPI.enable2FA();
      setEnableResult(res);
      setTwoFAStatus({ enabled: true });
    } catch (err: unknown) {
      setEnableError(
        err instanceof Error ? err.message : "Erreur lors de l'activation"
      );
    } finally {
      setEnableLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableLoading(true);
    setDisableError("");
    setDisableSuccess("");
    try {
      await authAPI.disable2FA(disableCode || undefined);
      setDisableSuccess("2FA désactivé avec succès.");
      setTwoFAStatus({ enabled: false });
      setDisableCode("");
      setEnableResult(null);
    } catch (err: unknown) {
      setDisableError(
        err instanceof Error ? err.message : "Erreur lors de la désactivation"
      );
    } finally {
      setDisableLoading(false);
    }
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      agent_officiel: "Agent officiel",
      administrateur: "Administrateur",
      citoyen: "Citoyen",
      admin_system: "Administrateur système",
    };
    return map[role.toLowerCase().replace(/\s+/g, "_")] ?? role;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Mon profil
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Informations de compte et sécurité
        </p>
      </div>

      {/* User info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
              {user?.prenom?.[0] ?? "?"}
              {user?.nom?.[0] ?? ""}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {user?.prenom} {user?.nom}
              </h2>
              <Badge variant="info">{roleLabel(user?.role ?? "")}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Mail size={13} />
              {user?.email}
            </p>
            {user?.date_creation && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Membre depuis le{" "}
                {new Date(user.date_creation).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              Identifiant
            </p>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
              {user?.id_utilisateur}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              Rôle
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              <User size={12} className="inline mr-1" />
              {roleLabel(user?.role ?? "")}
            </p>
          </div>
        </div>
      </Card>

      {/* 2FA management */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Authentification à deux facteurs (2FA)
          </h2>
        </div>

        {twoFALoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Chargement du statut…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              {twoFAStatus?.enabled ? (
                <>
                  <ShieldCheck
                    size={20}
                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      2FA activé
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {twoFAStatus.activated_at
                        ? `Activé le ${new Date(twoFAStatus.activated_at).toLocaleDateString("fr-FR")}`
                        : "Votre compte est protégé par Google Authenticator ou email"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldOff
                    size={20}
                    className="text-amber-500 dark:text-amber-400 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      2FA non activé
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Activez le 2FA pour renforcer la sécurité de votre compte
                    </p>
                  </div>
                </>
              )}
            </div>

            {!twoFAStatus?.enabled && (
              <div className="space-y-4">
                <Button
                  onClick={() => void handleEnable2FA()}
                  loading={enableLoading}
                  icon={<Smartphone size={15} />}
                  className="w-full"
                >
                  Activer Google Authenticator
                </Button>
                {enableError && (
                  <Alert variant="error" message={enableError} />
                )}
                {enableResult && (
                  <div className="space-y-4">
                    <Alert
                      variant="success"
                      message="2FA activé ! Scannez le QR code avec Google Authenticator."
                    />
                    {enableResult.qr_code && (
                      <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <QrCode
                          size={16}
                          className="text-slate-400 dark:text-slate-500"
                        />
                        <img
                          src={enableResult.qr_code}
                          alt="QR code 2FA"
                          className="w-48 h-48 rounded-lg"
                        />
                        <div className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">
                            Secret (conservez-le en lieu sûr)
                          </p>
                          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                            {enableResult.secret}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {twoFAStatus?.enabled && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pour désactiver le 2FA, saisissez votre code actuel :
                </p>
                <form
                  onSubmit={(e) => void handleDisable2FA(e)}
                  className="flex gap-2"
                >
                  <Input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="Code à 6 chiffres"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="danger"
                    loading={disableLoading}
                    icon={<ShieldOff size={14} />}
                  >
                    Désactiver
                  </Button>
                </form>
                {disableError && (
                  <Alert variant="error" message={disableError} />
                )}
                {disableSuccess && (
                  <Alert variant="success" message={disableSuccess} />
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
