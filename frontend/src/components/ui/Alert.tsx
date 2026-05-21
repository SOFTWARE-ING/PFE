import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
  danger:  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
  info:    "bg-army-50 text-army-700 border-army-200 dark:bg-dark-700 dark:text-army-400 dark:border-dark-500",
  neutral: "bg-army-50 text-army-600 border-army-200 dark:bg-dark-700 dark:text-dark-300 dark:border-dark-500",
};

export const Badge: React.FC<{ variant?: BadgeVariant; children: React.ReactNode }> = ({
  variant = "neutral", children,
}) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${badgeStyles[variant]}`}>
    {children}
  </span>
);

type AlertVariant = "success" | "error" | "warning" | "info";

const alertIcons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
};

const alertStyles: Record<AlertVariant, string> = {
  success: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50",
  error:   "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50",
  info:    "bg-army-50 text-army-800 border-army-200 dark:bg-dark-700 dark:text-dark-200 dark:border-dark-500",
};

export const Alert: React.FC<{ variant?: AlertVariant; message: string; className?: string }> = ({
  variant = "info", message, className = "",
}) => (
  <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${alertStyles[variant]} ${className}`}>
    <span className="mt-0.5 shrink-0">{alertIcons[variant]}</span>
    <span>{message}</span>
  </div>
);

export default Alert;
