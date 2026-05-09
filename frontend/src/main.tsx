import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme before first render to prevent flash
const saved = localStorage.getItem("shield_theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = saved === "dark" || (saved !== "light" && prefersDark);
document.documentElement.classList.toggle("dark", isDark);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
