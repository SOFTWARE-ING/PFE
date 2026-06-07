import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { authAPI } from "../../services/api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!token) setError("Lien invalide. Veuillez refaire une demande de réinitialisation.");
  }, [token]);

  const passwordStrength = (): { level: number; label: string; color: string } => {
    const p = newPassword;
    let score = 0;
    if (p.length >= 8)           score++;
    if (p.length >= 12)          score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[0-9]/.test(p))         score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 1, label: "Faible", color: "bg-red-500"     };
    if (score <= 3) return { level: 2, label: "Moyen",  color: "bg-amber-500"  };
    return                { level: 3, label: "Fort",   color: "bg-emerald-500" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword, confirm);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lien invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  const strength = newPassword ? passwordStrength() : null;

  return (
    <AuthLayout>
      <Card>
        {success ? (
          <div className="text-center py-4">
            <CheckCircle size={52} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-100 mb-2">
              Mot de passe mis à jour !
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-4">
              Redirection vers la connexion dans 3 secondes…
            </p>
            <Link
              to="/login"
              className="text-army-600 dark:text-army-400 text-sm font-medium hover:underline"
            >
              Se connecter maintenant
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-100">
                Nouveau mot de passe
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                Choisissez un mot de passe sécurisé d'au moins 8 caractères.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1.5 uppercase tracking-wide">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400"
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-army-200 dark:border-dark-600 bg-army-50/60 dark:bg-dark-800 text-sm text-gray-900 dark:text-dark-100 placeholder-gray-400 dark:placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-army-500/40 focus:border-army-400 dark:focus:border-army-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-dark-200"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Indicateur de force */}
                {strength && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength.level
                              ? strength.color
                              : "bg-gray-200 dark:bg-dark-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs font-medium ${
                        strength.level === 3
                          ? "text-emerald-600"
                          : strength.level === 2
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      Force : {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1.5 uppercase tracking-wide">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400"
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm placeholder-gray-400 dark:placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-army-500/40 transition bg-army-50/60 dark:bg-dark-800 text-gray-900 dark:text-dark-100 ${
                      confirm && confirm !== newPassword
                        ? "border-red-400 dark:border-red-600"
                        : "border-army-200 dark:border-dark-600"
                    }`}
                  />
                </div>
                {confirm && confirm !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <Button
                type="submit"
                loading={loading}
                disabled={
                  !newPassword ||
                  !confirm ||
                  newPassword !== confirm ||
                  !token
                }
                className="w-full mt-2"
              >
                {loading ? "Mise à jour…" : "Réinitialiser le mot de passe"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </AuthLayout>
  );
};

export default ResetPassword;