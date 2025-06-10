import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

import AdminLayout from './layouts/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import CombinedLoginPage from './pages/CombinedLoginPage.jsx';
import ProjectSelectionPage from './pages/public/ProjectSelectionPage.jsx';
import NoProjectsPage from './pages/public/NoProjectsPage.jsx';

// --- Protected Route Components ---
const AdminRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  if (loading) return null; // Or a loading spinner
  if (!currentUser) return <Navigate to="/" replace />;
  return isAdmin ? children : <Navigate to="/unauthorized" replace />;
};

const PublicRoute = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  if (loading) return null; // Or a loading spinner
  if (!currentUser) return <Navigate to="/" replace />;
  return !isAdmin ? children : <Navigate to="/admin/dashboard" replace />;
};

const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">Loading Alignzo...</div>
        </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<CombinedLoginPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>} />
      
      {/* Public User Routes */}
      <Route path="/user/*" element={<PublicRoute><PublicLayout /></PublicRoute>} />
      
      <Route path="/project-selection" element={<PublicRoute><ProjectSelectionPage /></PublicRoute>} />
      <Route path="/no-projects" element={<PublicRoute><NoProjectsPage /></PublicRoute>} />

      <Route path="/unauthorized" element={<div className="p-8 text-center"><h1>Unauthorized Access</h1><p>You do not have permission to view this page.</p></div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
