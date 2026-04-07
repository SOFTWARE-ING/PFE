// =============================
// File: src/components/ui/ThemeToggle.tsx
// =============================
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl border bg-white text-black dark:bg-gray-800 dark:text-white transition"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}