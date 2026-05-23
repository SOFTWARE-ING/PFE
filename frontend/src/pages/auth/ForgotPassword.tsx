// pages/auth/ForgotPassword.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { authAPI } from "../../services/api";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-army-600 to-army-800 shadow-lg mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-widest">SHIELD</h1>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">Signatures Officielles Sécurisées</p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-600 p-8">
          {sent ? (
            /* État succès */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle size={52} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Email envoyé</h2>
              <p className="text-sm text-gray-500 dark:text-dark-400 mb-6">
                Si l'adresse <strong>{email}</strong> est associée à un compte SHIELD,
                vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <p className="text-xs text-gray-400 dark:text-dark-500 mb-6">
                Vérifiez également votre dossier spam.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-army-600 dark:text-army-400 hover:underline text-sm font-medium"
              >
                <ArrowLeft size={14} />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Formulaire */
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mot de passe oublié ?</h2>
                <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                  Entrez votre adresse email pour recevoir un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200 mb-1.5 uppercase tracking-wide">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="votre@email.gouv.cm"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-500 bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-dark-100 placeholder-gray-400 dark:placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-army-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-army-600 to-army-700 text-white text-sm font-semibold hover:from-army-700 hover:to-army-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-dark-400 hover:text-army-600 dark:hover:text-army-400 transition-colors"
                >
                  <ArrowLeft size={13} />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
