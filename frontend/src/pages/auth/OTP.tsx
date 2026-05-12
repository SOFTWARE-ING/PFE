import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, RefreshCw } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Card } from "../../components/ui/Card";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { OTPCode } from "../../types";

interface OTPState {
  temp_token: string;
  user_id: string;
  from: string;
}

export default function OTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  const state = location.state as OTPState | null;

  const [otp, setOtp] = useState<OTPCode>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no state (user navigated here directly)
  useEffect(() => {
    if (!state?.temp_token) {
      navigate("/login", { replace: true });
    }
  }, [state, navigate]);
  // Auto-send email code on page load
  useEffect(() => {
    if (state?.temp_token) {
      authAPI.requestEmail2FA(state.temp_token).catch(() => { });
    }
  }, []);
  // Countdown timer after resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError("");
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits entered
    if (value && index === 5 && next.every((d) => d !== "")) {
      void submitCode(next.join(""));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setOtp(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) {
      void submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    if (!state?.temp_token) return;
    setLoading(true);
    setError("");

    try {
      const res = await authAPI.verify2FA({
        temp_token: state.temp_token,
        code_2fa: code,
        use_email: true,
      });

      if (!res.success) {
        setError("Code incorrect. Veuillez réessayer.");
        setOtp(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
        return;
      }

      const me = await authAPI.getMe();
      setAuth(res.access_token, me);
      navigate(state.from ?? "/dashboard", { replace: true });
    } catch (err: unknown) {
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Code invalide ou expiré. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    void submitCode(code);
  };

  const handleResend = async () => {
    if (!state?.temp_token || resending || countdown > 0) return;
    setResending(true);
    setError("");
    setSuccess("");

    try {
      await authAPI.requestEmail2FA(state.temp_token);
      setSuccess("Un nouveau code a été envoyé à votre adresse email.");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } catch {
      setError("Impossible d'envoyer le code. Veuillez réessayer.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Vérification en deux étapes"
      subtitle="Saisissez le code à 6 chiffres envoyé par email ou depuis votre application d'authentification"
    >
      <Card>
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
            <Shield size={28} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6-digit input */}
          <div
            className="flex justify-center gap-2.5"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (el) inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={loading}
                className={[
                  "w-11 h-13 text-center text-lg font-semibold rounded-xl border-2 transition-all duration-150",
                  "bg-white dark:bg-slate-900",
                  "text-slate-900 dark:text-slate-100",
                  "focus:outline-none focus:ring-0",
                  digit
                    ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-700 focus:border-indigo-400 dark:focus:border-indigo-500",
                  loading ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
                style={{ width: "2.75rem", height: "3.25rem" }}
              />
            ))}
          </div>

          {error && <Alert variant="error" message={error} />}
          {success && <Alert variant="success" message={success} />}

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            {loading ? "Vérification…" : "Vérifier le code"}
          </Button>
        </form>

        {/* Resend */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            Vous n'avez pas reçu le code ?
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleResend()}
            loading={resending}
            icon={<RefreshCw size={14} />}
            disabled={countdown > 0}
          >
            {countdown > 0
              ? `Renvoyer dans ${countdown}s`
              : "Renvoyer par email"}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline-offset-2 hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </Card>
    </AuthLayout>
  );
}
