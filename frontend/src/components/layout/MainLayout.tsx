import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Key,
  FileSignature,
  ScanText,
  User,
  LogOut,
  Menu,
  X,
  Settings,
  FolderOpen,
  Bell,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Recherche",
    icon: <Search size={16} />,
  },
  {
    to: "/dashboard/sign",
    label: "Signer un document",
    icon: <FileSignature size={16} />,
    roles: ["agent_officiel"],
  },
  {
    to: "/dashboard/my-documents",
    label: "Mes documents",
    icon: <FolderOpen size={16} />,
    roles: ["agent_officiel"],
  },
  {
    to: "/dashboard/signatures",
    label: "Signatures",
    icon: <ShieldCheck size={16} />,
    roles: ["agent_officiel"],
  },
  {
    to: "/dashboard/keys",
    label: "Clés cryptographiques",
    icon: <Key size={16} />,
    roles: ["agent_officiel"],
  },
  {
    to: "/dashboard/ocr",
    label: "Extraction OCR",
    icon: <ScanText size={16} />,
  },
  {
    to: "/dashboard/profile",
    label: "Mon profil",
    icon: <User size={16} />,
  },
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = user?.role?.toLowerCase().replace(/\s+/g, "_") ?? "";

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
      isActive
        ? "bg-army-700 text-white shadow-sm"
        : "text-army-700 dark:text-army-300 hover:text-army-900 dark:hover:text-army-100 hover:bg-army-100 dark:hover:bg-army-800/50",
    ].join(" ");

  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white dark:bg-[#151f09]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-army-100 dark:border-army-900/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-army-600 to-army-800 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-army-900 dark:text-army-50 tracking-widest">
            SHIELD
          </p>
          <p className="text-[10px] text-army-400 dark:text-army-600 truncate tracking-wide uppercase">
            Signatures Officielles
          </p>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-army-400 dark:text-army-700">
          Navigation
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-army-100 dark:border-army-900/60 pt-3">
        <NavLink
          to="/dashboard/settings"
          className={navLinkClass}
          onClick={() => setSidebarOpen(false)}
        >
          <Settings size={16} />
          <span>Paramètres</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* User card at bottom */}
      <div className="mx-3 mb-4 p-3 rounded-xl bg-army-50 dark:bg-army-900/30 border border-army-100 dark:border-army-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-army-500 to-army-700 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-army-800 dark:text-army-200 truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-[10px] text-army-500 dark:text-army-500 truncate">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-army-50 dark:bg-[#0f1607] transition-colors duration-200 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-army-100 dark:border-army-900/60">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 flex flex-col w-72 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Professional Top Bar ── */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-[#151f09] border-b border-army-100 dark:border-army-900/60 gap-3">
          {/* Left: hamburger (mobile) + breadcrumb / brand */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg text-army-500 hover:bg-army-100 dark:text-army-400 dark:hover:bg-army-800/50 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Brand pill — visible only on mobile */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-army-600 to-army-800 flex items-center justify-center shadow-sm">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold text-army-900 dark:text-army-100 tracking-widest">
                SHIELD
              </span>
            </div>

            {/* Desktop: subtle environment badge */}
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-army-50 dark:bg-army-900/40 border border-army-200 dark:border-army-800/60 text-[11px] font-medium text-army-600 dark:text-army-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Système opérationnel
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative p-2 rounded-xl text-army-500 dark:text-army-400 hover:bg-army-100 dark:hover:bg-army-800/50 transition-colors">
              <Bell size={18} />
            </button>

            <ThemeToggle />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-army-50 dark:hover:bg-army-800/40 transition-colors border border-transparent hover:border-army-200 dark:hover:border-army-700/60"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-army-500 to-army-700 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white">{initials}</span>
                </div>
                <span className="hidden sm:block text-xs font-semibold text-army-700 dark:text-army-300 max-w-[100px] truncate">
                  {user?.prenom}
                </span>
                <ChevronDown size={14} className="text-army-400 dark:text-army-600" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl bg-white dark:bg-[#1e2d0e] border border-army-100 dark:border-army-800/60 shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-army-50 dark:border-army-800/50">
                      <p className="text-xs font-semibold text-army-800 dark:text-army-200 truncate">
                        {user?.prenom} {user?.nom}
                      </p>
                      <p className="text-[11px] text-army-500 dark:text-army-500 truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate("/dashboard/profile"); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-army-700 dark:text-army-300 hover:bg-army-50 dark:hover:bg-army-800/40 transition-colors"
                      >
                        <User size={14} />
                        Mon profil
                      </button>
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate("/dashboard/settings"); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-army-700 dark:text-army-300 hover:bg-army-50 dark:hover:bg-army-800/40 transition-colors"
                      >
                        <Settings size={14} />
                        Paramètres
                      </button>
                      <div className="h-px bg-army-100 dark:bg-army-800/50 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut size={14} />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
