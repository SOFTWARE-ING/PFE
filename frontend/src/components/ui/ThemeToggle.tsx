import React from "react";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../../hooks/useDarkMode";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { darkMode, setDarkMode } = useDarkMode();
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      aria-label="Toggle theme"
      className={[
        "p-2 rounded-xl border transition-all duration-200",
        "bg-white dark:bg-dark-700",
        "border-army-200 dark:border-dark-500",
        "text-army-600 dark:text-dark-200",
        "hover:bg-army-50 dark:hover:bg-dark-600",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
