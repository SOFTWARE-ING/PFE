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
        <h1 className="text-xl font-semibold text-army-900 dark:text-army-50">
          Paramètres
        </h1>
        <p className="text-sm text-army-500 dark:text-army-400 mt-0.5">
          Personnalisez votre expérience
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-army-600 dark:text-army-400" />
          <h2 className="text-sm font-semibold text-army-800 dark:text-army-200">
            Apparence
          </h2>
        </div>

        <div>
          <p className="text-xs font-medium text-army-500 dark:text-army-500 uppercase tracking-wide mb-3">
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
                    ? "border-army-600 bg-army-50 text-army-700 dark:bg-army-900/50 dark:text-army-300 dark:border-army-500"
                    : "border-army-200 dark:border-army-800 text-army-600 dark:text-army-400 hover:border-army-300 dark:hover:border-army-700",
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
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-army-200 dark:border-army-800 text-sm font-medium text-army-600 dark:text-army-400 hover:border-army-300 dark:hover:border-army-700 transition-all"
            >
              <Monitor size={16} />
              Système
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-army-800 dark:text-army-200">
            À propos
          </h2>
          <div className="space-y-1.5 text-xs text-army-500 dark:text-army-400">
            <p>
              <span className="font-medium text-army-700 dark:text-army-300">
                Application :
              </span>{" "}
              SHIELD — Système de Signature de Communiqués Officiels
            </p>
            <p>
              <span className="font-medium text-army-700 dark:text-army-300">
                API :
              </span>{" "}
              FastAPI · PostgreSQL · RSA-2048-PSS / SHA-256
            </p>
            <p>
              <span className="font-medium text-army-700 dark:text-army-300">
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
