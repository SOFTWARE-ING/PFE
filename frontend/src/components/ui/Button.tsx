import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 shadow-sm",
  ghost:
    "text-slate-600 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 h-8",
  md: "text-sm px-4 py-2 h-10",
  lg: "text-sm px-6 py-2.5 h-11",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}) => (
  <button
    className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={disabled ?? loading}
    {...rest}
  >
    {loading ? (
      <svg
        className="animate-spin h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
        />
      </svg>
    ) : (
      icon
    )}
    {children}
  </button>
);

export default Button;
