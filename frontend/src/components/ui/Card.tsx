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
      "bg-white/90 dark:bg-[#243010]/90",
      "border border-white/60 dark:border-green-900/50",
      "shadow-xl shadow-black/10 dark:shadow-black/40",
      "backdrop-blur-md",
      "rounded-2xl",
      "transition-all duration-300",
      paddings[padding],
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

export default Card;
