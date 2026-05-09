import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  padding = "md",
}) => (
  <div
    className={[
      "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm",
      paddings[padding],
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

export default Card;
