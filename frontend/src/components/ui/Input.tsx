import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  type = "text",
  className = "",
  id,
  icon: Icon,
  ...rest
}) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-600 dark:text-green-300/80"
        >
          {label}
        </label>
      )}

      <div className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition",
        "bg-white/80 dark:bg-[#1e2d0a]/80",
        error
          ? "border-rose-400 focus-within:ring-2 focus-within:ring-rose-400"
          : "border-gray-200 dark:border-green-900/60 focus-within:ring-2 focus-within:ring-green-500/60 dark:focus-within:ring-green-600/50",
      ].join(" ")}>
        {Icon && (
          <Icon size={18} className="text-gray-400 dark:text-green-600 shrink-0" />
        )}

        <input
          id={inputId}
          type={isPassword && show ? "text" : type}
          className={[
            "w-full bg-transparent outline-none text-sm",
            "text-gray-900 dark:text-green-100",
            "placeholder:text-gray-400 dark:placeholder:text-green-700",
            isPassword ? "pr-2" : "",
            className,
          ].join(" ")}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="text-gray-400 dark:text-green-600 hover:text-gray-600 dark:hover:text-green-400 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-green-700">{hint}</p>}
    </div>
  );
};

export default Input;
