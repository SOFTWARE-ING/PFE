import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
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
        navigate("/otp", {
          state: {
            temp_token: res.access_token,
            user_id: res.id_utilisateur,
            from,
          },
          replace: true,
        });
      } else {
        const me = await authAPI.getMe(res.access_token);
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
    <AuthLayout>
      <Card>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-green-100">
          Secure Access Portal
        </h2>

        <p className="text-center text-sm text-gray-500 dark:text-green-400/70 mt-1 mb-6">
          Enter your credentials to continue
        </p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="agent@gouv.org"
            value={form.email}
            onChange={handleChange}
            icon={Mail}
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            name="mot_de_passe"
            type="password"
            placeholder="••••••••"
            value={form.mot_de_passe}
            onChange={handleChange}
            icon={Lock}
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
            {loading ? "Connexion…" : "Login"}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
