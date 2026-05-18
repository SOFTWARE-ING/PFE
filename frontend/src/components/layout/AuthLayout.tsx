import React from "react";
import { ThemeToggle } from "../ui/ThemeToggle";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-[#1a2509] transition-colors duration-500">

      {/* ===== BACKGROUND ===== */}
      <div className="absolute inset-0 overflow-hidden">

        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br
          from-green-200/40 via-lime-100/30 to-emerald-200/40
          dark:from-[#2e3e14]/60 dark:via-[#1a2509]/80 dark:to-[#1a2f0a]/50"
        />

        {/* Cyber Grid */}
        <div className="absolute inset-0 opacity-20 dark:opacity-25
          bg-[linear-gradient(to_right,#4a7c1f_1px,transparent_1px),linear-gradient(to_bottom,#4a7c1f_1px,transparent_1px)]
          bg-[size:40px_40px]"
        />

        {/* Radial dots */}
        <div className="absolute inset-0
          bg-[radial-gradient(circle,rgba(74,124,31,0.15)_1px,transparent_1px)]
          [background-size:22px_22px] dark:opacity-60"
        />

        {/* Floating Symbols */}
        <div className="absolute w-full h-full">
          <div className="absolute top-10 left-10 w-40 h-40
            border border-green-400/30 dark:border-green-600/25
            rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-20 w-52 h-52
            border border-lime-400/20 dark:border-lime-600/20
            rotate-45 animate-spin-slow" />
          <div className="absolute top-1/3 left-1/2 w-32 h-32
            border border-emerald-400/30 dark:border-emerald-700/30
            rounded-lg animate-float" />
          {/* Glow blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[400px] h-[400px] rounded-full
            bg-green-500/10 dark:bg-green-800/15 blur-2xl" />
        </div>
      </div>

      {/* ThemeToggle — top-right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
