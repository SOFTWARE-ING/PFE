import React from "react";
import { FileText, Upload, ShieldCheck } from "lucide-react";

const Sidebar: React.FC = () => {
  return (
    <aside className="
      w-64
      bg-white/80 dark:bg-slate-800/80
      backdrop-blur
      border-r border-slate-200 dark:border-slate-700
      p-5
    ">
      <h2 className="text-lg font-bold mb-8 text-slate-800 dark:text-slate-200">
        SecureSign
      </h2>

      <nav className="space-y-4 text-sm">

        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer">
          <FileText size={18} />
          Dashboard
        </div>

        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer">
          <Upload size={18} />
          Upload Document
        </div>

        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer">
          <ShieldCheck size={18} />
          Verification Logs
        </div>

      </nav>
    </aside>
  );
};

export default Sidebar;