import React, { useState } from 'react';
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
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div style={{display: 'flex', height: '100vh', backgroundColor: 'var(--light-bg)'}} className="dark:bg-[var(--dark-bg)]">
            <Sidebar isMobileOpen={isMobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                <Header onMenuClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)} />
                <main style={{flex: 1, overflowX: 'hidden', overflowY: 'auto', padding: '1.5rem'}}>
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
                                {/* Add other public routes here when created */}
                            </>
                        )}
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
