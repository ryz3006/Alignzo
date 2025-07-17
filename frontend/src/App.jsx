import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProtectedRoute from "./components/common/AdminProtectedRoute";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/public/Dashboard";
import ProtectedRoute from "./components/common/ProtectedRoute";
import CombinedLoginPage from "./pages/CombinedLoginPage";

function App() {
  return (
    <AdminAuthProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CombinedLoginPage />} />
            <Route path="/login" element={<CombinedLoginPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <AdminDashboard />
                  </AppLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/user/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* ...other routes... */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AdminAuthProvider>
  );
}

export default App;
