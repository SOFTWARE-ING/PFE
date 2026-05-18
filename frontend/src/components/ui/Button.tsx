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
  "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-army-700 text-white hover:bg-army-800 focus:ring-army-600 dark:bg-army-600 dark:hover:bg-army-700 dark:focus:ring-army-500 shadow-sm",
  secondary:
    "bg-white text-army-800 border border-army-200 hover:bg-army-50 focus:ring-army-500 dark:bg-[#2e4415] dark:text-army-200 dark:border-army-700/50 dark:hover:bg-[#3a5018] shadow-sm",
  ghost:
    "text-army-700 hover:bg-army-50 focus:ring-army-400 dark:text-army-300 dark:hover:bg-[#2e4415]/60",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm",
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
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
      </svg>
    ) : icon}
    {children}
  </button>
);

export default Button;
