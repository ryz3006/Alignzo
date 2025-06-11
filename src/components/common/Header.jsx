import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

const Header = () => {
    const { currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('/projects')) return 'Projects';
        if (path.includes('/users')) return 'Users';
        if (path.includes('/settings')) return 'Settings';
        if (path.includes('/dashboard')) return 'Dashboard';
        return 'Alignzo';
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };
    
    return (
         <header className="flex justify-between items-center p-4 neumorph-outset">
            <h1 className="text-2xl font-semibold text-primary">{getPageTitle()}</h1>
             <div className="flex items-center space-x-4">
                 <button onClick={toggleTheme} className="p-2 rounded-full neumorph-outset">
                     {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                 </button>
                 <span className="font-semibold">{currentUser?.email}</span>
                 <button onClick={handleLogout} className="flex items-center btn-primary" style={{borderRadius: '12px', padding: '8px 16px'}}>
                    <LogoutIcon />
                    Logout
                 </button>
             </div>
         </header>
    );
};

export default Header;
