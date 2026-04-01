import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import OTP from "../pages/auth/OTP";

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/otp" element={<OTP />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;