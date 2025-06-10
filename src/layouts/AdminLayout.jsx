import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import ProjectManagementPage from '../pages/admin/ProjectManagementPage.jsx';
import UserManagementPage from '../pages/admin/UserManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import Header from '../components/common/Header.jsx';

const AdminLayout = () => {
    const adminNavItems = [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/projects", label: "Projects" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/settings", label: "Settings" }
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            <Sidebar navItems={adminNavItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                    <Routes>
                        <Route path="dashboard" element={<AdminDashboardPage />} />
                        <Route path="projects" element={<ProjectManagementPage />} />
                        <Route path="users" element={<UserManagementPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
