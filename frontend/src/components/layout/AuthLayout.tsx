
// File: AuthLayout.tsx
import ThemeToggle from "../ui/ThemeToggle";

export const AuthLayout = ({ children }: any) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-200 dark:bg-gray-900 transition-colors duration-500 overflow-hidden">

      <div className="absolute inset-0 overflow-hidden">

        {/* Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/40 via-indigo-200/30 to-purple-200/40 dark:from-blue-900/30 dark:via-indigo-900/20 dark:to-purple-900/30" />

        {/* Cyber Grid */}
        <div className="absolute inset-0 opacity-20 dark:opacity-30 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Floating Symbols */}
        <div className="absolute w-full h-full">
          <div className="absolute top-10 left-10 w-40 h-40 border border-blue-400/30 rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-20 w-52 h-52 border border-purple-400/30 rotate-45 animate-spin-slow" />
          <div className="absolute top-1/3 left-1/2 w-32 h-32 border border-cyan-400/30 rounded-lg animate-float" />
        </div>
      </div>

      {/* Softer grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="z-10">{children}</div>
    </div>
  );
};