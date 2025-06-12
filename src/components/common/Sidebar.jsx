import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import LogoWithName from '../../assets/images/Logo_with_Name.png';
import LogoOnly from '../../assets/images/Logo_only.png';
import { useAuth } from '../../contexts/AuthContext';

const DashboardIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
const ProjectsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;
const UsersIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>;
const SettingsIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 00-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
const DoubleArrowLeftIcon = () => <svg style={{width: '1.5rem', height: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>;
const DoubleArrowRightIcon = () => <svg style={{width: '1.5rem', height: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" /></svg>;
const KanbanIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1.5-1.5m1.5 1.5l1.5-1.5m0 0l1.5 1.5m-1.5-1.5l-1.5 1.5" /></svg>;
const ListIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>;
const TrackerIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ProfileIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const ScheduleIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008z" /></svg>;
const DocumentIcon = () => <svg style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const ProjectSettingsIcon = () => (
  <svg
    style={{ height: '1.5rem', width: '1.5rem' }}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 1.5c.621 0 1.125.504 1.125 1.125v.326a8.988 8.988 0 013.591 1.49l.23-.23a1.125 1.125 0 111.591 1.591l-.23.23a8.988 8.988 0 011.49 3.591h.326c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.326a8.988 8.988 0 01-1.49 3.591l.23.23a1.125 1.125 0 11-1.591 1.591l-.23-.23a8.988 8.988 0 01-3.591 1.49v.326c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125v-.326a8.988 8.988 0 01-3.591-1.49l-.23.23a1.125 1.125 0 11-1.591-1.591l.23-.23a8.988 8.988 0 01-1.49-3.591H1.5c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h.326a8.988 8.988 0 011.49-3.591l-.23-.23a1.125 1.125 0 011.591-1.591l.23.23a8.988 8.988 0 013.591-1.49v-.326c0-.621.504-1.125 1.125-1.125h1.5zM12 15a3 3 0 100-6 3 3 0 000 6z"
    />
  </svg>
);


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
        { to: "/user/project-operations", label: "Project Operations", icon: <ListIcon /> },
        { to: "/user/work-tracker", label: "Work Tracker", icon: <TrackerIcon /> },
        { to: "/user/profile", label: "My Profile", icon: <ProfileIcon /> },
        { to: "/user/shift-schedule", label: "Shift Schedule", icon: <ScheduleIcon /> },
        { to: "/user/documents", label: "Documents", icon: <DocumentIcon /> },
        { to: "/user/project-settings", label: "Project Settings", icon: <ProjectSettingsIcon /> },
    ];
    const navItems = isAdmin ? adminNavItems : publicNavItems;

    const isMobileScreen = window.innerWidth < 768;
  
    const responsiveClasses = `absolute inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`;

    const sidebarStyle = {
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        transition: 'width 0.3s ease-in-out, transform 0.3s ease-in-out',
        width: isMinimized ? '80px' : '240px',
        zIndex: 20,
        flexShrink: 0,
        position: isMobileScreen ? 'fixed' : 'relative',
        height: '100%',
        transform: isMobileScreen ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        borderRadius: '0'
    };
   return (
        <aside className="neumorph-outset" style={sidebarStyle}>
            <style>{`
                .nav-link { display: flex; align-items: center; padding: 0.75rem; border-radius: 12px; transition: all 0.2s ease; color: var(--light-text); text-decoration: none; }
                html.dark .nav-link { color: var(--dark-text); }
                .nav-link.active { box-shadow: inset 5px 5px 10px var(--light-shadow-dark), inset -5px -5px 10px var(--light-shadow-light); color: var(--light-primary); }
                html.dark .nav-link.active { box-shadow: inset 5px 5px 10px var(--dark-shadow-dark), inset -5px -5px 10px var(--dark-shadow-light); color: var(--dark-primary); }
                .nav-link:not(.active):hover { transform: translateY(-2px); box-shadow: 4px 4px 8px var(--light-shadow-dark), -4px -4px 8px var(--light-shadow-light); }
                html.dark .nav-link:not(.active):hover { box-shadow: 4px 4px 8px var(--dark-shadow-dark), -4px -4px 8px var(--dark-shadow-light); }
                @media (max-width: 767px) { .hidden-on-mobile { display: none; } }
            `}</style>
            <div style={{height: '3rem', margin: '0.5rem 0 2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={isMinimized ? LogoOnly : LogoWithName} alt="Alignzo Logo" style={{height: '2.5rem', transition: 'all 0.3s'}} />
            </div>
            <nav style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem'}}>
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={() => isMobileOpen && setMobileOpen(false)}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${isMinimized ? 'justify-center' : ''}`}
                    >
                        <div style={{width: '24px', flexShrink: 0}}>{item.icon}</div>
                        {!isMinimized && <span style={{fontWeight: '600', marginLeft: '1rem'}}>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>
            <div style={{padding: '0.5rem'}} className="hidden-on-mobile">
                <button onClick={() => setIsMinimized(!isMinimized)} className="btn neumorph-outset" style={{padding: '0.75rem', width: '100%'}}>
                    <span className="text-strong">{isMinimized ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
