import { Settings, Moon, Sun, Monitor } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useDarkMode } from "../../hooks/useDarkMode";

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useDarkMode();

  const themeOptions = [
    { label: "Clair", value: false, icon: <Sun size={16} /> },
    { label: "Sombre", value: true, icon: <Moon size={16} /> },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Paramètres
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Personnalisez votre expérience
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Apparence
          </h2>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Thème
          </p>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setDarkMode(opt.value)}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  darkMode === opt.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600",
                ].join(" ")}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => {
                const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
                setDarkMode(sys);
                localStorage.removeItem("shield_theme");
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <Monitor size={16} />
              Système
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            À propos
          </h2>
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Application :
              </span>{" "}
              SHIELD — Système de Signature de Communiqués Officiels
            </p>
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                API :
              </span>{" "}
              FastAPI · PostgreSQL · RSA-2048-PSS / SHA-256
            </p>
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Frontend :
              </span>{" "}
              React 19 · Vite 8 · Tailwind CSS 4
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
