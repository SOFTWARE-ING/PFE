// routes/AppRouter.tsx — v3 avec routes admin + reset MDP
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login            from "../pages/auth/Login";
import OTP              from "../pages/auth/OTP";
import ForgotPassword   from "../pages/auth/ForgotPassword";
import ResetPassword    from "../pages/auth/ResetPassword";
import SearchPage       from "../pages/dashboard/Search";
import SignaturesPage   from "../pages/dashboard/Signatures";
import KeysPage         from "../pages/dashboard/Keys";
import OCRPage          from "../pages/dashboard/OCR";
import ProfilePage      from "../pages/dashboard/Profile";
import SettingsPage     from "../pages/dashboard/Settings";
import SignPage         from "../pages/dashboard/Sign";
import MyDocumentsPage  from "../pages/dashboard/MyDocuments";
import AdminDashboard   from "../pages/dashboard/Admin/AdminDashboard";
import AdminUsers       from "../pages/dashboard/Admin/AdminUsers";
import AdminLogs        from "../pages/dashboard/Admin/AdminLogs";
import AdminSessions    from "../pages/dashboard/Admin/AdminSessions";
import { MainLayout }   from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import VerifyDocument from "../pages/dashboard/VerifyDocument";

const W = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><MainLayout>{children}</MainLayout></ProtectedRoute>
);

const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/login"           element={<Login />} />
      <Route path="/otp"             element={<OTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/verify"          element={<VerifyDocument />} />

      {/* ── Dashboard général ──────────────────────────────────────────── */}
      <Route path="/dashboard"              element={<W><SearchPage /></W>} />
      <Route path="/dashboard/sign"         element={<W><SignPage /></W>} />
      <Route path="/dashboard/my-documents" element={<W><MyDocumentsPage /></W>} />
      <Route path="/dashboard/signatures"   element={<W><SignaturesPage /></W>} />
      <Route path="/dashboard/keys"         element={<W><KeysPage /></W>} />
      <Route path="/dashboard/ocr"          element={<W><OCRPage /></W>} />
      <Route path="/dashboard/profile"      element={<W><ProfilePage /></W>} />
      <Route path="/dashboard/settings"     element={<W><SettingsPage /></W>} />
      <Route path="/dashboard/verify"       element={<VerifyDocument />} />

      {/* ── Panneau Admin ──────────────────────────────────────────────── */}
      <Route path="/dashboard/admin"          element={<W><AdminDashboard /></W>} />
      <Route path="/dashboard/admin/users"    element={<W><AdminUsers /></W>} />
      <Route path="/dashboard/admin/logs"     element={<W><AdminLogs /></W>} />
      <Route path="/dashboard/admin/sessions" element={<W><AdminSessions /></W>} />

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
