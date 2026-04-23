import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<Props> = ({
  label,
  name,
  type = "text",
  placeholder,
  onChange,
}) => {
  const [show, setShow] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="relative">
      <label className="block mb-1 text-sm font-medium">
        {label}
      </label>

      <input
        name={name}
        type={isPassword && show ? "text" : type}
        placeholder={placeholder}
        onChange={onChange}
        className="
        w-full px-4 py-2 rounded-lg border
        bg-white text-gray-900 border-gray-300
        dark:bg-gray-800 dark:text-white dark:border-gray-600
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition
      "
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-9 text-gray-500 dark:text-gray-300"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
};

export default Input;