import React from "react";

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="
      w-full max-w-md p-6 rounded-2xl shadow-lg
      bg-white text-gray-900
      dark:bg-gray-800 dark:text-white
      transition-colors duration-300
    "
    >
        
      {children}
    </div>
  );
};

export default Card;