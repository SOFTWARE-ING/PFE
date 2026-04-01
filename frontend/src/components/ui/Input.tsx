import React from "react";
import type { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

const Input: React.FC<InputProps> = ({ label, icon: Icon, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex items-center border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
        {Icon && <Icon className="w-5 h-5 text-gray-400 mr-2" />}
        <input
          className="w-full outline-none bg-transparent"
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;