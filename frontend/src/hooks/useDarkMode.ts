import { useEffect, useState } from "react";

export const useDarkMode = () => {
  const getInitialTheme = (): boolean => {
    const saved = localStorage.getItem("theme");

    if (saved === "dark") return true;
    if (saved === "light") return false;

    // fallback: system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const [darkMode, setDarkMode] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return { darkMode, setDarkMode };
};