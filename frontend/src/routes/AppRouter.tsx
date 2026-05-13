// import React from "react";
// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Navigate,
// } from "react-router-dom";
// import Login from "../pages/auth/Login";
// import OTP from "../pages/auth/OTP";
// import SearchPage from "../pages/dashboard/Search";
// import SignaturesPage from "../pages/dashboard/Signatures";
// import KeysPage from "../pages/dashboard/Keys";
// import OCRPage from "../pages/dashboard/OCR";
// import ProfilePage from "../pages/dashboard/Profile";
// import SettingsPage from "../pages/dashboard/Settings";
// import { MainLayout } from "../components/layout/MainLayout";
// import { ProtectedRoute } from "../components/layout/ProtectedRoute";

// const AppRouter: React.FC = () => {
//   return (
//     <BrowserRouter>
//       <Routes>
//         {/* Public */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/otp" element={<OTP />} />

//         {/* Protected dashboard */}
//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <SearchPage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/dashboard/signatures"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <SignaturesPage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/dashboard/keys"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <KeysPage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/dashboard/ocr"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <OCRPage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/dashboard/profile"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <ProfilePage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/dashboard/settings"
//           element={
//             <ProtectedRoute>
//               <MainLayout>
//                 <SettingsPage />
//               </MainLayout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Fallback */}
//         <Route path="/" element={<Navigate to="/login" replace />} />
//         <Route path="*" element={<Navigate to="/login" replace />} />
//       </Routes>
//     </BrowserRouter>
//   );
// };

// export default AppRouter;


import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import OTP from "../pages/auth/OTP";
import SearchPage from "../pages/dashboard/Search";
import SignaturesPage from "../pages/dashboard/Signatures";
import KeysPage from "../pages/dashboard/Keys";
import OCRPage from "../pages/dashboard/OCR";
import ProfilePage from "../pages/dashboard/Profile";
import SettingsPage from "../pages/dashboard/Settings";
import SignPage from "../pages/dashboard/Sign";
import MyDocumentsPage from "../pages/dashboard/MyDocuments";
import { MainLayout } from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<OTP />} />

        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><SearchPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/sign" element={<ProtectedRoute><MainLayout><SignPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/my-documents" element={<ProtectedRoute><MainLayout><MyDocumentsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/signatures" element={<ProtectedRoute><MainLayout><SignaturesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/keys" element={<ProtectedRoute><MainLayout><KeysPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/ocr" element={<ProtectedRoute><MainLayout><OCRPage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/profile" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;