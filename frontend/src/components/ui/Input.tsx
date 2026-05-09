import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  type = "text",
  className = "",
  id,
  ...rest
}) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type={isPassword && show ? "text" : type}
          className={[
            "w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900",
            "text-slate-900 dark:text-slate-100",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            error
              ? "border-rose-400 focus:ring-rose-400 dark:border-rose-500"
              : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400",
            "focus:outline-none focus:ring-2 focus:border-transparent",
            "transition duration-150",
            isPassword ? "pr-10" : "",
            className,
          ].join(" ")}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
};

export default Input;
