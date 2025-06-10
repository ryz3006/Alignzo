import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Import your public pages
import PublicDashboardPage from '../pages/public/DashboardPage.jsx';
// ... other public pages
// Import shared layout components
import Sidebar from '../components/common/Sidebar.jsx';
import Header from '../components/common/Header.jsx';

const PublicLayout = () => {
    const publicNavItems = [
        { to: "/user/dashboard", label: "Dashboard" },
        // ... add other public nav items later
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans">
            <Sidebar navItems={publicNavItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
                    <Routes>
                        <Route path="dashboard" element={<PublicDashboardPage />} />
                        {/* ... other nested public routes ... */}
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default PublicLayout;
