import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import OTP from "../pages/auth/OTP";
import Dashboard from "../pages/dashboard/Dashboard";

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/otp" element={<OTP />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default AppRouter;