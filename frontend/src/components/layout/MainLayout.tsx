// components/layout/MainLayout.tsx — v3 avec navigation admin
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, Key, FileSignature, ScanText,
  User, LogOut, Menu, X, Settings, FolderOpen, Bell,
  ChevronDown, LayoutDashboard, Users, ScrollText, ScanSearch, Radio,
} from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";

interface NavItem { to: string; label: string; icon: React.ReactNode; roles?: string[]; }

const navItems: NavItem[] = [
  { to: "/dashboard",              label: "Recherche",             icon: <Search size={16} /> },
  { to: "/dashboard/verify",       label: "Vérifier un document",  icon: <ScanSearch size={16} /> },
  { to: "/dashboard/sign",         label: "Signer un document",    icon: <FileSignature size={16} />, roles: ["agent_officiel"] },
  { to: "/dashboard/my-documents", label: "Mes documents",         icon: <FolderOpen size={16} />,   roles: ["agent_officiel"] },
  { to: "/dashboard/signatures",   label: "Signatures",            icon: <ShieldCheck size={16} />,  roles: ["agent_officiel"] },
  { to: "/dashboard/keys",         label: "Clés cryptographiques", icon: <Key size={16} />,          roles: ["agent_officiel"] },
  { to: "/dashboard/ocr",          label: "Extraction OCR",        icon: <ScanText size={16} /> },
  { to: "/dashboard/profile",      label: "Mon profil",            icon: <User size={16} /> },
];

const adminItems: NavItem[] = [
  { to: "/dashboard/admin",          label: "Tableau de bord",  icon: <LayoutDashboard size={16} /> },
  { to: "/dashboard/admin/users",    label: "Utilisateurs",     icon: <Users size={16} /> },
  { to: "/dashboard/admin/logs",     label: "Logs d'audit",     icon: <ScrollText size={16} /> },
  { to: "/dashboard/admin/sessions", label: "Sessions actives", icon: <Radio size={16} /> },
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = user?.role?.toLowerCase().replace(/\s+/g, "_") ?? "";
  const isAdmin  = userRole === "administrateur";
  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(userRole));
  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };
  const initials = `${user?.prenom?.[0] ?? ""}${user?.nom?.[0] ?? ""}`.toUpperCase();

  const navLinkClass = ({ isActive }: { isActive: boolean }) => [
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
    isActive ? "bg-army-600 text-white shadow-sm" : "text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600",
  ].join(" ");

  const adminNavLinkClass = ({ isActive }: { isActive: boolean }) => [
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
    isActive ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-dark-100 hover:bg-purple-50 dark:hover:bg-purple-950/20",
  ].join(" ");

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white dark:bg-dark-800">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-dark-600">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-army-600 to-army-800 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-dark-100 tracking-widest">SHIELD</p>
          <p className="text-[10px] text-gray-400 dark:text-dark-400 truncate tracking-wide uppercase">Signatures Officielles</p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-dark-400">Navigation</p>
      </div>
      <nav className="flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {isAdmin && (
        <>
          <div className="px-5 pt-3 pb-2 border-t border-gray-100 dark:border-dark-600">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">Administration</p>
          </div>
          <nav className="px-3 pb-2 space-y-0.5">
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === "/dashboard/admin"} className={adminNavLinkClass} onClick={() => setSidebarOpen(false)}>
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <div className="px-3 pb-4 space-y-0.5 border-t border-gray-100 dark:border-dark-600 pt-3">
        <NavLink to="/dashboard/settings" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
          <Settings size={16} /><span>Paramètres</span>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all duration-150">
          <LogOut size={16} /><span>Déconnexion</span>
        </button>
      </div>

      <div className="mx-3 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-army-500 to-army-700 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-dark-100 truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-[10px] text-gray-500 dark:text-dark-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200 overflow-hidden">
      <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-gray-100 dark:border-dark-600"><Sidebar /></div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-72 shadow-2xl"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-600 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700 transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-army-50 dark:bg-dark-700 border border-army-100 dark:border-dark-500 text-[11px] font-medium text-army-600 dark:text-army-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Système opérationnel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-gray-400 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"><Bell size={18} /></button>
            <ThemeToggle />
            <div className="relative">
              <button onClick={() => setUserMenuOpen(o => !o)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-dark-500">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-army-500 to-army-700 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white">{initials}</span>
                </div>
                <span className="hidden sm:block text-xs font-semibold text-gray-700 dark:text-dark-200 max-w-[100px] truncate">{user?.prenom}</span>
                <ChevronDown size={14} className="text-gray-400 dark:text-dark-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl bg-white dark:bg-dark-700 border border-gray-100 dark:border-dark-500 shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 dark:border-dark-600">
                      <p className="text-xs font-semibold text-gray-800 dark:text-dark-100 truncate">{user?.prenom} {user?.nom}</p>
                      <p className="text-[11px] text-gray-500 dark:text-dark-400 truncate mt-0.5">{user?.email}</p>
                      {isAdmin && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">Administrateur</span>}
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button onClick={() => { setUserMenuOpen(false); navigate("/dashboard/profile"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"><User size={14} />Mon profil</button>
                      <button onClick={() => { setUserMenuOpen(false); navigate("/dashboard/settings"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"><Settings size={14} />Paramètres</button>
                      {isAdmin && <button onClick={() => { setUserMenuOpen(false); navigate("/dashboard/admin"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"><LayoutDashboard size={14} />Panneau Admin</button>}
                      <div className="h-px bg-gray-100 dark:bg-dark-600 my-1" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><LogOut size={14} />Déconnexion</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
