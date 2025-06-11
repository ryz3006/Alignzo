import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase.js';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" style={{height: '1.25rem', width: '1.25rem', marginRight: '0.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const MenuIcon = ({ onClick }) => <button onClick={onClick} style={{marginRight: '1rem', border: 'none', background: 'transparent', cursor: 'pointer'}}><svg xmlns="http://www.w3.org/2000/svg" style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>;


const Header = ({ onMenuClick }) => {
    const { currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname.split('/').pop();
        if(path) return path.charAt(0).toUpperCase() + path.slice(1);
        return 'Dashboard';
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) { console.error("Logout error:", error); }
    };
    
    return (
         <header className="neumorph-outset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '0' }}>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <MenuIcon onClick={onMenuClick} />
                <h1 style={{fontSize: '1.5rem', fontWeight: '600'}} className="text-primary">{getPageTitle()}</h1>
            </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                 <button onClick={toggleTheme} className="btn neumorph-outset" style={{borderRadius: '50%', padding: '0.75rem'}}>
                     {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                 </button>
                 <span style={{fontWeight: '500'}} className="text-strong">{currentUser?.email}</span>
                 <button onClick={handleLogout} className="btn neumorph-outset" style={{color: 'var(--light-primary)'}}>
                    <LogoutIcon />
                    Logout
                 </button>
             </div>
         </header>
    );
};

export default Header;
