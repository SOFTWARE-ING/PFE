import React from "react";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../../hooks/useDarkMode";

export const ThemeToggle: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { darkMode, setDarkMode } = useDarkMode();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      aria-label="Toggle theme"
      className={[
        "p-2 rounded-xl border transition-all duration-200",
        "bg-white/90 dark:bg-[#2e4415]/80",
        "border-army-200 dark:border-army-700/60",
        "text-army-600 dark:text-army-300",
        "hover:bg-army-50 dark:hover:bg-[#3a5018]/80",
        "shadow-sm hover:shadow",
        className,
      ].join(" ")}
      style={
        {
          "--army-200": "#c3dba5",
          "--army-300": "#9fc472",
          "--army-600": "#4a7223",
          "--army-700": "#3a581b",
        } as React.CSSProperties
      }
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
