import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

const badgeStyles: Record<BadgeVariant, string> = {
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border-emerald-800",
  danger:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800",
  warning:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-400 dark:border-amber-800",
  info:
    "bg-army-50 text-army-700 border-army-200 dark:bg-army-950/70 dark:text-army-400 dark:border-army-800",
  neutral:
    "bg-army-50 text-army-600 border-army-200 dark:bg-army-900/50 dark:text-army-400 dark:border-army-800",
};

export const Badge: React.FC<{
  variant?: BadgeVariant;
  children: React.ReactNode;
}> = ({ variant = "neutral", children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${badgeStyles[variant]}`}
  >
    {children}
  </span>
);

// ─── Alert ────────────────────────────────────────────────────────────────────

type AlertVariant = "success" | "error" | "warning" | "info";

const alertIcons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
};

const alertStyles: Record<AlertVariant, string> = {
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  error:
    "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  warning:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  info:
    "bg-army-50 text-army-800 border-army-200 dark:bg-army-900/40 dark:text-army-300 dark:border-army-700",
};

export const Alert: React.FC<{
  variant?: AlertVariant;
  message: string;
  className?: string;
}> = ({ variant = "info", message, className = "" }) => (
  <div
    className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${alertStyles[variant]} ${className}`}
  >
    <span className="mt-0.5 shrink-0">{alertIcons[variant]}</span>
    <span>{message}</span>
  </div>
);

export default Alert;
