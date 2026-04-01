import React from "react";
import { Sun, Moon } from "lucide-react";
import { useDarkMode } from "../../hooks/useDarkMode";

const DarkModeToggle: React.FC = () => {
  const { darkMode, setDarkMode } = useDarkMode();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="absolute top-5 right-5 p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition"
    >
      {darkMode ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-800" />
      )}
    </button>
  );
};

export default DarkModeToggle;