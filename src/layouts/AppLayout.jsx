import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import ProjectManagementPage from '../pages/admin/ProjectManagementPage.jsx';
import UserManagementPage from '../pages/admin/UserManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';
import PublicDashboardPage from '../pages/public/DashboardPage.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import Header from '../components/common/Header.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const AppLayout = () => {
    const { isAdmin } = useAuth();

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Routes>
                        {isAdmin ? (
                            <>
                                <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                                <Route path="admin/projects" element={<ProjectManagementPage />} />
                                <Route path="admin/users" element={<UserManagementPage />} />
                                <Route path="admin/settings" element={<SettingsPage />} />
                            </>
                        ) : (
                            <>
                                <Route path="user/dashboard" element={<PublicDashboardPage />} />
                                {/* ...other public routes... */}
                            </>
                        )}
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
