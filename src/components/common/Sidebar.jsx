import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LogoWithName from '../../assets/images/Logo_with_Name.png';
import LogoOnly from '../../assets/images/Logo_only.png';
import { useAuth } from '../../contexts/AuthContext';

// ... (Icon components can be defined here)

const Sidebar = () => {
    const { isAdmin } = useAuth();
    const [isMinimized, setIsMinimized] = useState(false);

    const adminNavItems = [
        { to: "/admin/dashboard", label: "Dashboard" },
        { to: "/admin/projects", label: "Projects" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/settings", label: "Settings" }
    ];

    const publicNavItems = [
        { to: "/user/dashboard", label: "Dashboard" },
        // Define other public routes here
    ];

    const navItems = isAdmin ? adminNavItems : publicNavItems;
    
    return (
        <aside className={`neumorph-outset flex flex-col p-4 transition-all duration-300 ${isMinimized ? 'w-24' : 'w-64'}`}>
            <div className="logo-container h-12 mb-8 flex items-center justify-center">
                <img src={isMinimized ? LogoOnly : LogoWithName} alt="Alignzo Logo" className="h-10 transition-all" />
            </div>
            <nav className="flex-1 space-y-2">
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) => `flex items-center p-3 rounded-xl transition-all ${isActive ? 'neumorph-inset text-primary' : 'hover:bg-opacity-50'}`}
                    >
                        {/* Add Icon Here */}
                        <span className={`font-semibold ml-4 ${isMinimized ? 'hidden' : ''}`}>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-3 rounded-xl neumorph-outset mt-4">
                {/* Add Toggle Icon Here */}
            </button>
        </aside>
    );
};

export default Sidebar;
