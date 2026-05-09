import React from "react";
import { Sun, Moon } from "lucide-react";

const Navbar: React.FC = () => {

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="
      h-16
      px-6
      flex items-center justify-between
      bg-white/70 dark:bg-slate-800/70
      backdrop-blur
      border-b border-slate-200 dark:border-slate-700
    ">

      <h1 className="font-semibold text-slate-700 dark:text-slate-200">
        Dashboard
      </h1>

      <button
        onClick={toggleTheme}
        className="
          p-2 rounded-lg
          bg-slate-200 dark:bg-slate-700
          hover:scale-105 transition
        "
      >
        <Sun className="hidden dark:block" size={18} />
        <Moon className="block dark:hidden" size={18} />
      </button>

    </header>
  );
};

export default Navbar;