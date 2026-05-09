import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<Props> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="
      fixed inset-0 z-50
      flex items-center justify-center
      bg-black/40 backdrop-blur-sm
    ">

      <div className="
        w-full max-w-md
        p-6 rounded-2xl
        bg-white dark:bg-slate-800
        border border-slate-200 dark:border-slate-700
      ">

        {children}

        <button
          onClick={onClose}
          className="mt-4 text-sm text-slate-500 hover:text-red-500"
        >
          Cancel
        </button>

      </div>
    </div>
  );
};

export default Modal;