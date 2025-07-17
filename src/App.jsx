import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./layouts/AppLayout";
import CombinedLoginPage from "./pages/CombinedLoginPage";
import AdminDashboard from "./pages/admin/Dashboard";
import UserDashboard from "./pages/public/Dashboard";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<CombinedLoginPage />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <UserDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* ...other routes */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App; 