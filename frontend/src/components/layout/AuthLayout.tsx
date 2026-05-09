import React from "react";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div
      className="
        relative min-h-screen
        flex flex-col
        overflow-hidden
        bg-slate-200
        dark:bg-[#0f172a]
        transition-colors
        duration-500
      "
    >
      {/* ================= BACKGROUND ================= */}

      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-br
            from-blue-200/60
            via-indigo-200/40
            to-cyan-200/50

            dark:from-blue-950/50
            dark:via-slate-900/60
            dark:to-cyan-950/40
          "
        />

        {/* Cyber Grid */}
        <div
          className="
            absolute inset-0
            opacity-20 dark:opacity-30
            bg-[linear-gradient(to_right,#3b82f620_1px,transparent_1px),linear-gradient(to_bottom,#3b82f620_1px,transparent_1px)]
            bg-[size:42px_42px]
          "
        />

        {/* Radial Dots */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle,rgba(59,130,246,0.12)_1px,transparent_1px)]
            [background-size:24px_24px]
            dark:opacity-70
          "
        />

        {/* Floating Symbols */}
        <div className="absolute inset-0">
          {/* Circle */}
          <div
            className="
              absolute top-12 left-12
              w-44 h-44
              rounded-full
              border border-blue-400/30
              animate-pulse
            "
          />

          {/* Square */}
          <div
            className="
              absolute bottom-24 right-24
              w-52 h-52
              rotate-45
              border border-cyan-400/20
              animate-spin-slow
            "
          />

          {/* Hex */}
          <div
            className="
              absolute top-1/3 left-1/2
              w-32 h-32
              rounded-2xl
              border border-indigo-400/30
              animate-float
            "
          />

          {/* Shield Glow */}
          <div
            className="
              absolute top-1/2 left-1/2
              -translate-x-1/2 -translate-y-1/2
              w-[450px] h-[450px]
              rounded-full
              bg-blue-500/10
              blur-3xl
            "
          />
        </div>
      </div>

      {/* ================= HEADER ================= */}

      <header
        className="
          relative z-20
          flex items-center justify-between
          px-6 py-4
          border-b
          border-white/20
          dark:border-slate-700/40
          backdrop-blur-xl
          bg-white/40
          dark:bg-slate-900/30
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              w-10 h-10
              rounded-xl
              bg-gradient-to-br
              from-blue-600
              to-indigo-700
              flex items-center justify-center
              shadow-lg shadow-blue-500/30
            "
          >
            <ShieldCheck size={20} className="text-white" />
          </div>

          <div>
            <h1
              className="
                text-sm font-bold tracking-widest
                text-slate-800 dark:text-white
              "
            >
              SHIELD
            </h1>

            <p
              className="
                text-xs
                text-slate-600 dark:text-slate-400
              "
            >
              Secure Government Signature Platform
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* ================= CONTENT ================= */}

      <main
        className="
          relative z-10
          flex-1
          flex items-center justify-center
          px-4 py-12
        "
      >
        <div className="w-full max-w-md">
          {(title || subtitle) && (
            <div className="mb-8 text-center">
              {title && (
                <h1
                  className="
                    text-3xl font-bold
                    text-slate-900
                    dark:text-white
                  "
                >
                  {title}
                </h1>
              )}

              {subtitle && (
                <p
                  className="
                    mt-2 text-sm
                    text-slate-600
                    dark:text-slate-400
                  "
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>
      </main>

      {/* ================= FOOTER ================= */}

      <footer
        className="
          relative z-10
          py-4 text-center text-xs
          text-slate-600 dark:text-slate-500
          border-t border-white/20
          dark:border-slate-700/30
          backdrop-blur-xl
          bg-white/30 dark:bg-slate-900/20
        "
      >
        © {new Date().getFullYear()} Shield — Plateforme sécurisée de
        signature officielle
      </footer>
    </div>
  );
};

export default AuthLayout;