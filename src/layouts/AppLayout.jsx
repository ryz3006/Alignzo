import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import ProjectManagementPage from '../pages/admin/ProjectManagementPage.jsx';
import UserManagementPage from '../pages/admin/UserManagementPage.jsx';
import SettingsPage from '../pages/admin/SettingsPage.jsx';
import PublicDashboardPage from '../pages/public/DashboardPage.jsx';
import ProjectBoardPage from '../pages/public/ProjectBoardPage.jsx';
import ProjectOperationsPage from '../pages/public/ProjectOperationsPage.jsx';
import WorkTrackerPage from '../pages/public/WorkTrackerPage.jsx';
import ProfilePage from '../pages/public/ProfilePage.jsx';
import ShiftSchedulePage from '../pages/public/ShiftSchedulePage.jsx';
import DocumentRepositoryPage from '../pages/public/DocumentRepositoryPage.jsx';
import ProjectSettingsPage from '../pages/public/ProjectSettingsPage.jsx';
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
                                <Route path="user/project-board" element={<ProjectBoardPage />} />
                                <Route path="user/project-operations" element={<ProjectOperationsPage />} />
                                <Route path="user/work-tracker" element={<WorkTrackerPage />} />
                                <Route path="user/profile" element={<ProfilePage />} />
                                <Route path="user/shift-schedule" element={<ShiftSchedulePage />} />
                                <Route path="user/documents" element={<DocumentRepositoryPage />} />
                                <Route path="user/project-settings" element={<ProjectSettingsPage />} />
                            </>
                        )}
                         <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
