import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import AdminLayout from './layouts/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import CombinedLoginPage from './pages/CombinedLoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import PublicDashboardPage from './pages/public/DashboardPage.jsx';

// --- Protected Route Components ---
const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/" />;
  return isAdmin ? children : <Navigate to="/unauthorized" />;
};

const PublicRoute = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/" />;
  return !isAdmin ? children : <Navigate to="/admin/dashboard" />;
};

const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<CombinedLoginPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="dashboard" element={<AdminDashboardPage />} />
        {/* Add other admin pages here later, e.g., projects, users */}
      </Route>
      
      {/* Public User Routes */}
      <Route path="/user" element={<PublicRoute><PublicLayout /></PublicRoute>}>
        <Route path="dashboard" element={<PublicDashboardPage />} />
         {/* Add other public pages here later, e.g., tasks, reports */}
      </Route>

      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
