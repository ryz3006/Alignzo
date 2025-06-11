import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LogoWithName from '../../assets/images/Logo_with_Name.png';
import LogoOnly from '../../assets/images/Logo_only.png';
import { useAuth } from '../../contexts/AuthContext';

// Icon components
const DashboardIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ProjectsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a6 6 0 00-9-5.197" /></svg>;
const SettingsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const DoubleArrowLeftIcon = () => <svg style={{width: '1.5rem', height: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>;
const DoubleArrowRightIcon = () => <svg style={{width: '1.5rem', height: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" /></svg>;

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const { isAdmin } = useAuth();

    const adminNavItems = [
        { to: "/admin/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
        { to: "/admin/projects", label: "Projects", icon: <ProjectsIcon /> },
        { to: "/admin/users", label: "Users", icon: <UsersIcon /> },
        { to: "/admin/settings", label: "Settings", icon: <SettingsIcon /> }
    ];
    const publicNavItems = [
        { to: "/user/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    ];
    const navItems = isAdmin ? adminNavItems : publicNavItems;
    
    // Determine responsive classes
    const responsiveClasses = `
        absolute inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
    `;

    return (
        <aside className={`neumorph-outset flex flex-col p-2 transition-all duration-300 ease-in-out z-20 flex-shrink-0 ${isMinimized ? 'w-24' : 'w-60'} ${responsiveClasses}`}>
            <div style={{height: '3rem', margin: '0.5rem 0 2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={isMinimized ? LogoOnly : LogoWithName} alt="Alignzo Logo" style={{height: '2.5rem', transition: 'all 0.3s'}} />
            </div>
            <nav style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${isMinimized ? 'justify-center' : ''}`}
                    >
                        <style>{`
                            .nav-link { display: flex; align-items: center; padding: 0.75rem; border-radius: 12px; transition: all 0.2s ease; color: var(--light-text); text-decoration: none; }
                            html.dark .nav-link { color: var(--dark-text); }
                            .nav-link.active { box-shadow: inset 5px 5px 10px var(--light-shadow-dark), inset -5px -5px 10px var(--light-shadow-light); color: var(--light-primary); }
                            html.dark .nav-link.active { box-shadow: inset 5px 5px 10px var(--dark-shadow-dark), inset -5px -5px 10px var(--dark-shadow-light); color: var(--dark-primary); }
                            .nav-link:not(.active):hover { transform: translateY(-2px); box-shadow: 4px 4px 8px var(--light-shadow-dark), -4px -4px 8px var(--light-shadow-light); }
                            html.dark .nav-link:not(.active):hover { box-shadow: 4px 4px 8px var(--dark-shadow-dark), -4px -4px 8px var(--dark-shadow-light); }
                        `}</style>
                        <div style={{width: '24px', flexShrink: 0}}>{item.icon}</div>
                        {!isMinimized && <span style={{fontWeight: '600', marginLeft: '1rem'}}>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>
            <div style={{padding: '0.5rem'}} className="hidden md:block">
                <button onClick={() => setIsMinimized(!isMinimized)} className="btn neumorph-outset" style={{padding: '0.75rem', width: '100%'}}>
                    {isMinimized ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
