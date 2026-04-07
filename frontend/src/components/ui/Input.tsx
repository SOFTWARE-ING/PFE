import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  label: string;
  name: string;
  type: string;
  icon?: LucideIcon;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<Props> = ({
  label,
  name,
  type,
  icon: Icon,
  placeholder,
  onChange,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-secondaryLight dark:text-text-secondaryDark">
        {label}
      </label>

      <div
        className="
        flex items-center gap-3
        px-4 py-3
        rounded-xl
        bg-white/80 dark:bg-slate-800/80
        border border-border-light dark:border-border-dark
        focus-within:ring-2 focus-within:ring-blue-500
        transition
      "
      >
        {Icon && (
          <Icon size={18} className="text-gray-400 shrink-0" />
        )}

        <input
          name={name}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          onChange={onChange}
          className="
            w-full bg-transparent outline-none
            text-text-primaryLight dark:text-text-primaryDark
            placeholder:text-gray-400
          "
        />

        {/* 👁️ Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;