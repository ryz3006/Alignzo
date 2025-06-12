import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import CombinedLoginPage from './pages/CombinedLoginPage.jsx';
import ProjectSelectionPage from './pages/public/ProjectSelectionPage.jsx';
import NoProjectsPage from './pages/public/NoProjectsPage.jsx';
import Loader from './components/common/Loader.jsx'; // Import the loader

const ProtectedRoute = ({ children }) => {
    const { currentUser, authLoading } = useAuth();
    if (authLoading) return <Loader />;
    return currentUser ? children : <Navigate to="/" replace />;
};

const App = () => {
    const { authLoading, isAppLoading } = useAuth();

    if (authLoading) {
        return <Loader />;
    }

    return (
        <>
            {isAppLoading && <Loader />}
            <Routes>
                <Route path="/" element={<CombinedLoginPage />} />
                <Route path="/project-selection" element={<ProtectedRoute><ProjectSelectionPage /></ProtectedRoute>} />
                <Route path="/no-projects" element={<ProtectedRoute><NoProjectsPage /></ProtectedRoute>} />
                <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            </Routes>
        </>
    );
};

export default App;
