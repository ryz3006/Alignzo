import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LogoWithName from '../../assets/images/Logo_with_Name.png';
import LogoOnly from '../../assets/images/Logo_only.png';
import { useAuth } from '../../contexts/AuthContext';

// New, theme-appropriate SVG Icons
const DashboardIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
const ProjectsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;
const UsersIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM12 21a2.25 2.25 0 01-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h.093c.537 0 .983.31 1.205.762a10.998 10.998 0 01.44 1.25m-1.605-1.01a5.625 5.625 0 01-9 0M12 21a2.25 2.25 0 01-2.25-2.25v-1.5a2.25 2.25 0 012.25-2.25h.093c.537 0 .983.31 1.205.762a10.998 10.998 0 01.44 1.25m-1.605-1.01a5.625 5.625 0 01-9 0" /></svg>;
const SettingsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
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
    
    return (
        <aside className={`neumorph-outset flex flex-col p-2 transition-all duration-300 ease-in-out z-20 flex-shrink-0 absolute md:relative inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`} style={{width: isMinimized ? '80px' : '240px', borderRadius: '0'}}>
            <style>{`
                .nav-link { display: flex; align-items: center; padding: 0.75rem; border-radius: 12px; transition: all 0.2s ease; color: var(--light-text); text-decoration: none; }
                html.dark .nav-link { color: var(--dark-text); }
                .nav-link.active { box-shadow: inset 5px 5px 10px var(--light-shadow-dark), inset -5px -5px 10px var(--light-shadow-light); color: var(--light-primary); }
                html.dark .nav-link.active { box-shadow: inset 5px 5px 10px var(--dark-shadow-dark), inset -5px -5px 10px var(--dark-shadow-light); color: var(--dark-primary); }
                .nav-link:not(.active):hover { transform: translateY(-2px); box-shadow: 4px 4px 8px var(--light-shadow-dark), -4px -4px 8px var(--light-shadow-light); }
                html.dark .nav-link:not(.active):hover { box-shadow: 4px 4px 8px var(--dark-shadow-dark), -4px -4px 8px var(--dark-shadow-light); }
            `}</style>
            <div style={{height: '3rem', margin: '0.5rem 0 2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={isMinimized ? LogoOnly : LogoWithName} alt="Alignzo Logo" style={{height: '2.5rem', transition: 'all 0.3s'}} />
            </div>
            <nav style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem'}}>
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={() => { if(window.innerWidth < 768) setMobileOpen(false) }}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${isMinimized ? 'justify-center' : ''}`}
                    >
                        <div style={{width: '24px', flexShrink: 0}}>{item.icon}</div>
                        {!isMinimized && <span style={{fontWeight: '600', marginLeft: '1rem'}}>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>
            <div style={{padding: '0.5rem'}} className="hidden md:block">
                <button onClick={() => setIsMinimized(!isMinimized)} className="btn neumorph-outset" style={{padding: '0.75rem', width: '100%'}}>
                    <span className="text-strong">{isMinimized ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
