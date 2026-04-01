import React from "react";
import ThemeToggle from "../ui/ThemeToggle";

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="
      min-h-screen flex items-center justify-center relative
      bg-gray-100 text-gray-900
      dark:bg-gray-900 dark:text-white
      transition-colors duration-300
    "
    >
      <ThemeToggle />
      {children}
    </div>
  );
};

export default AuthLayout;