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
        "p-2 rounded-xl border transition-colors",
        "bg-white/80 dark:bg-[#2e3e14]/80",
        "border-gray-200 dark:border-green-900/60",
        "text-gray-600 dark:text-green-300",
        "hover:bg-white dark:hover:bg-[#3a5018]/80",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
