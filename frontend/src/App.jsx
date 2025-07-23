import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import AdminProtectedRoute from "./components/common/AdminProtectedRoute";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/public/Dashboard";
import ProtectedRoute from "./components/common/ProtectedRoute";
import CombinedLoginPage from "./pages/CombinedLoginPage";
import GlobalLoader from "./components/common/GlobalLoader";
import UserManagement from "./pages/admin/UserManagement";
import ProjectManagement from "./pages/admin/ProjectManagement";
import SettingsManagement from "./pages/admin/SettingsManagement";

function App() {
  // Replace this with your actual global loading state
  const [loading, setLoading] = useState(false); // Global loading state
  return (
    <>
      {loading && <GlobalLoader />}
      <AdminAuthProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<CombinedLoginPage setLoading={setLoading} />} />
              <Route path="/login" element={<CombinedLoginPage setLoading={setLoading} />} />
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
                path="/admin/users"
                element={
                  <AdminProtectedRoute>
                    <AppLayout>
                      <UserManagement />
                    </AppLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/projects"
                element={
                  <AdminProtectedRoute>
                    <AppLayout>
                      <ProjectManagement />
                    </AppLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminProtectedRoute>
                    <AppLayout>
                      <SettingsManagement />
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
    </>
  );
}

export default App;
