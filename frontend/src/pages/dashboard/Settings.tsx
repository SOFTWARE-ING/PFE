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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-100">Paramètres</h1>
        <p className="text-sm text-gray-500 dark:text-dark-400 mt-0.5">Personnalisez votre expérience</p>
      </div>
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-army-600 dark:text-army-400" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-100">Apparence</h2>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wide mb-3">Thème</p>
          <div className="flex gap-2">
            {themeOptions.map(opt => (
              <button key={String(opt.value)} onClick={() => setDarkMode(opt.value)}
                className={["flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  darkMode === opt.value
                    ? "border-army-600 bg-army-50 text-army-700 dark:bg-dark-700 dark:text-army-400 dark:border-army-500"
                    : "border-gray-200 dark:border-dark-500 text-gray-600 dark:text-dark-300 hover:border-gray-300 dark:hover:border-dark-400",
                ].join(" ")}>
                {opt.icon}{opt.label}
              </button>
            ))}
            <button onClick={() => { const sys = window.matchMedia("(prefers-color-scheme: dark)").matches; setDarkMode(sys); localStorage.removeItem("shield_theme"); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-500 text-sm font-medium text-gray-600 dark:text-dark-300 hover:border-gray-300 dark:hover:border-dark-400 transition-all">
              <Monitor size={16} />Système
            </button>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-100 mb-3">À propos</h2>
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-dark-400">
          <p><span className="font-medium text-gray-700 dark:text-dark-200">Application :</span> SHIELD — Système de Signature de Communiqués Officiels</p>
          <p><span className="font-medium text-gray-700 dark:text-dark-200">API :</span> FastAPI · PostgreSQL · RSA-2048-PSS / SHA-256</p>
          <p><span className="font-medium text-gray-700 dark:text-dark-200">Frontend :</span> React 19 · Vite 8 · Tailwind CSS 4</p>
        </div>
      </Card>
    </div>
  );
}
