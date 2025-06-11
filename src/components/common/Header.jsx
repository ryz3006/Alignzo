import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const SunIcon = () => <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LogoutIcon = () => <svg style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ProfileIcon = () => <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const MenuIcon = ({ onClick }) => <button onClick={onClick} className="btn neumorph-outset" style={{ borderRadius: '50%', padding: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" style={{height: '1.5rem', width: '1.5rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>;

const Header = ({ onMenuClick }) => {
    const { currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const getPageTitle = () => {
        const path = location.pathname.split('/').pop();
        if(path) {
            const title = path.replace(/-/g, ' ');
            return title.charAt(0).toUpperCase() + title.slice(1);
        }
        return 'Dashboard';
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
         <header className="neumorph-outset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderRadius: '0', flexShrink: 0 }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <div style={{display: 'block' /* md:hidden */}}><MenuIcon onClick={onMenuClick} /></div>
                <h1 style={{fontSize: '1.5rem', fontWeight: '600'}} className="text-primary">{getPageTitle()}</h1>
            </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                 <button onClick={toggleTheme} className="btn neumorph-outset" style={{borderRadius: '50%', padding: '0.75rem'}}>
                     {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                 </button>
                 <div style={{position: 'relative'}}>
                    <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="btn neumorph-outset" style={{borderRadius: '50%', padding: '0.75rem'}}>
                        <ProfileIcon />
                    </button>
                    {profileMenuOpen && (
                        <div className="neumorph-outset" style={{position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: '250px', padding: '1rem', zIndex: 50, borderRadius: '12px'}}>
                            <p style={{margin: 0, fontWeight: '600', textAlign: 'center'}} className="text-strong">{currentUser?.displayName || currentUser?.email}</p>
                            <div style={{height: '1px', background: 'var(--light-text)', margin: '1rem 0', opacity: 0.2}}></div>
                            <button onClick={handleLogout} className="btn neumorph-outset" style={{width: '100%', color: 'var(--light-primary)'}}>
                                <LogoutIcon />
                                Logout
                            </button>
                        </div>
                    )}
                 </div>
             </div>
         </header>
    );
};

export default Header;
