import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

const Header = () => {
    const { currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };
    
    return (
         <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Welcome</h1>
             <div className="flex items-center space-x-4">
                 <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                     {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                 </button>
                 <span className="text-gray-600 dark:text-gray-300">{currentUser?.email}</span>
                 <button onClick={handleLogout} className="text-red-500 hover:text-red-700">
                    Logout
                 </button>
             </div>
         </header>
    );
};

export default Header;
