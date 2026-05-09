// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/public/Home";
import Login from "../pages/auth/Login";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/login", element: <Login /> },
]);