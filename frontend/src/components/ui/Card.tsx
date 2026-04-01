import React from "react";

interface CardProps {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children }) => {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md">
      {children}
    </div>
  );
};

export default Card;