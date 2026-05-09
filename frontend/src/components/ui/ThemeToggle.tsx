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
        "p-2 rounded-lg transition-colors",
        "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
        "hover:bg-slate-100 dark:hover:bg-slate-800",
        className,
      ].join(" ")}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
