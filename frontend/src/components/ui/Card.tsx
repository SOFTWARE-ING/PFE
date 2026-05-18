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
  padding = "lg",
}) => (
  <div
    className={[
      "bg-white dark:bg-[#1e2d0e]",
      "border border-army-100 dark:border-army-800/60",
      "shadow-sm dark:shadow-black/30",
      "rounded-2xl",
      "transition-all duration-200",
      paddings[padding],
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

export default Card;
