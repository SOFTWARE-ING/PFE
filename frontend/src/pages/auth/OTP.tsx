import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Alert } from "../../components/ui/Alert";
import { Card } from "../../components/ui/Card";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { OTPCode } from "../../types";

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 180; // 3 minutes

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

  const [otp, setOtp] = useState<OTPCode>(Array(OTP_LENGTH).fill("") as OTPCode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(COUNTDOWN_SECONDS);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no state
  useEffect(() => {
    if (!state?.temp_token) {
      navigate("/login", { replace: true });
    }
  }, [state, navigate]);

  // Auto-send email code on page load
  useEffect(() => {
    if (state?.temp_token) {
      authAPI.requestEmail2FA(state.temp_token).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown — when it hits 0, auto-resend
  useEffect(() => {
    if (timer <= 0) {
      handleAutoResend();
      return;
    }
    const t = setTimeout(() => setTimer((c) => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  const handleAutoResend = useCallback(async () => {
    if (!state?.temp_token) return;
    try {
      await authAPI.requestEmail2FA(state.temp_token);
      setSuccess("Un nouveau code vous a été envoyé par email.");
      setOtp(Array(OTP_LENGTH).fill("") as OTPCode);
      inputsRef.current[0]?.focus();
      setTimer(COUNTDOWN_SECONDS);
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Impossible d'envoyer le code. Veuillez réessayer.");
    }
  }, [state]);

  const submitCode = useCallback(async (code: string) => {
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
        setOtp(Array(OTP_LENGTH).fill("") as OTPCode);
        inputsRef.current[0]?.focus();
        return;
      }

      const me = await authAPI.getMe(res.access_token);
      setAuth(res.access_token, me);
      navigate(state.from ?? "/dashboard", { replace: true });
    } catch (err: unknown) {
      setOtp(Array(OTP_LENGTH).fill("") as OTPCode);
      inputsRef.current[0]?.focus();
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Code invalide ou expiré. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  }, [state, setAuth, navigate]);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp] as OTPCode;
    next[index] = value;
    setOtp(next);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (value && index === OTP_LENGTH - 1 && next.every((d) => d !== "")) {
      void submitCode(next.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp] as OTPCode;
    pasted.split("").forEach((char, i) => { next[i] = char; });
    setOtp(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) void submitCode(pasted);
  };

  const handleManualResend = async () => {
    if (!state?.temp_token || resending) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await authAPI.requestEmail2FA(state.temp_token);
      setSuccess("Un nouveau code vous a été envoyé par email.");
      setOtp(Array(OTP_LENGTH).fill("") as OTPCode);
      inputsRef.current[0]?.focus();
      setTimer(COUNTDOWN_SECONDS);
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Impossible d'envoyer le code. Veuillez réessayer.");
    } finally {
      setResending(false);
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = (timer % 60).toString().padStart(2, "0");

  return (
    <AuthLayout>
      <Card>
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-green-100 mb-2">
          Two-Factor Authentication
        </h2>

        <p className="text-center text-sm text-gray-500 dark:text-green-400/70 mb-6">
          Enter the verification code sent to your email.
        </p>

        {/* OTP inputs — no submit button, auto-submits */}
        <div className="flex justify-between gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputsRef.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={loading}
              className={[
                "w-12 h-14 text-center text-lg font-semibold rounded-xl border-2 transition-all duration-150 outline-none",
                "bg-white/80 dark:bg-[#1e2d0a]/80",
                "text-gray-900 dark:text-green-100",
                digit
                  ? "border-green-500 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-green-900/50 focus:border-green-500 dark:focus:border-green-600",
                loading ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
          ))}
        </div>

        {error && <Alert variant="error" message={error} className="mb-4" />}
        {success && <Alert variant="success" message={success} className="mb-4" />}

        {/* Countdown */}
        <p className="text-center text-sm text-gray-500 dark:text-green-400/70 mb-4">
          Code expires in{" "}
          <span className={`font-semibold ${timer <= 30 ? "text-rose-500" : "text-green-600 dark:text-green-400"}`}>
            {minutes}:{seconds}
          </span>
        </p>

        {/* Manual resend link */}
        <p className="text-center text-xs text-gray-400 dark:text-green-700">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={() => void handleManualResend()}
            disabled={resending}
            className="text-green-600 dark:text-green-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resending ? "Sending…" : "Resend email"}
          </button>
        </p>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-xs text-gray-400 dark:text-green-700 hover:text-gray-600 dark:hover:text-green-500 transition-colors hover:underline underline-offset-2"
          >
            Back to login
          </button>
        </div>
      </Card>
    </AuthLayout>
  );
}
