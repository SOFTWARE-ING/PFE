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
          className="text-sm font-medium text-army-700 dark:text-dark-200"
        >
          {label}
        </label>
      )}

      <div className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150",
        "bg-army-50/60 dark:bg-dark-800",
        error
          ? "border-rose-400 focus-within:ring-2 focus-within:ring-rose-400/40"
          : "border-army-200 dark:border-dark-600 focus-within:ring-2 focus-within:ring-army-500/40 focus-within:border-army-400 dark:focus-within:border-army-500",
      ].join(" ")}>
        {Icon && (
          <Icon size={18} className="text-army-400 dark:text-dark-400 shrink-0" />
        )}
        <input
          id={inputId}
          type={isPassword && show ? "text" : type}
          className={[
            "w-full bg-transparent outline-none text-sm",
            "text-army-900 dark:text-dark-100",
            "placeholder:text-army-400 dark:placeholder:text-dark-400",
            className,
          ].join(" ")}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="text-army-400 dark:text-dark-400 hover:text-army-600 dark:hover:text-dark-200 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-army-500 dark:text-dark-400">{hint}</p>}
    </div>
  );
};

export default Input;
