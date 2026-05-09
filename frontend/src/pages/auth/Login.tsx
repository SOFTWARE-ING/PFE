import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Card } from "../../components/ui/Card";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { LoginFormData } from "../../types";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  const [form, setForm] = useState<LoginFormData>({
    email: "",
    mot_de_passe: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/dashboard";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.mot_de_passe) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await authAPI.login(form);

      if (!res.success) {
        setError(res.message);
        return;
      }

      if (res.requires_2fa) {
        // Redirect to OTP page with the temporary token
        navigate("/otp", {
          state: {
            temp_token: res.access_token,
            user_id: res.id_utilisateur,
            from,
          },
          replace: true,
        });
      } else {
        // Login without 2FA — fetch user info and go to dashboard
        const me = await authAPI.getMe();
        setAuth(res.access_token, me);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace sécurisé de signature officielle"
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            label="Adresse email"
            name="email"
            type="email"
            placeholder="agent@gouv.sn"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <Input
            label="Mot de passe"
            name="mot_de_passe"
            type="password"
            placeholder="••••••••"
            value={form.mot_de_passe}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />

          {error && <Alert variant="error" message={error} />}

          <Button
            type="submit"
            loading={loading}
            icon={<LogIn size={16} />}
            className="w-full"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
          Plateforme réservée aux agents officiels habilités
        </p>
      </Card>
    </AuthLayout>
  );
}
