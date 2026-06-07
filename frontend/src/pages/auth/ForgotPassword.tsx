import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { authAPI } from "../../services/api";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

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
    <AuthLayout>
      <Card>
        {sent ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle size={52} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-100 mb-3">
              Email envoyé
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-6">
              Si l'adresse <strong>{email}</strong> est associée à un compte
              SHIELD, vous recevrez un lien de réinitialisation dans quelques
              minutes.
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
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-100">
                Mot de passe oublié ?
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                Entrez votre adresse email pour recevoir un lien de
                réinitialisation.
              </p>
            </div>

            {error && <Alert variant="error" message={error} className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.gouv.cm"
                icon={Mail}
                required
              />

              <Button
                type="submit"
                loading={loading}
                disabled={!email}
                className="w-full"
              >
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
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
      </Card>
    </AuthLayout>
  );
};

export default ForgotPassword;