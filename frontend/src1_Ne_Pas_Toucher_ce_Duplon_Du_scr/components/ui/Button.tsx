import React from "react";

const Button: React.FC<{
  children: React.ReactNode;
  type?: "button" | "submit";
}> = ({ children, type = "button" }) => {
  return (
    <button
      type={type}
      className="
      w-full py-2 rounded-lg font-medium
      bg-blue-600 text-white
      hover:bg-blue-700
      transition
    "
    >
      {children}
    </button>
  );
};

export default Button;