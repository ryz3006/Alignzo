import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import CombinedLoginPage from './pages/CombinedLoginPage.jsx';
import ProjectSelectionPage from './pages/public/ProjectSelectionPage.jsx';
import NoProjectsPage from './pages/public/NoProjectsPage.jsx';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) return <div>Loading...</div>; // Or a spinner component
    return currentUser ? children : <Navigate to="/" replace />;
};

const App = () => {
    const { loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading Alignzo...</div>;
    }

    return (
        <Routes>
            <Route path="/" element={<CombinedLoginPage />} />
            <Route path="/project-selection" element={<ProtectedRoute><ProjectSelectionPage /></ProtectedRoute>} />
            <Route path="/no-projects" element={<ProtectedRoute><NoProjectsPage /></ProtectedRoute>} />
            <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
    );
};

export default App;
