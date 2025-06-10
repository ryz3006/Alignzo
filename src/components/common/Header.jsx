import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
// ... (Your icon components can go here or be imported)

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
            {/* Page title would go here, managed by a context or passed as prop */}
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Welcome</h1>
             <div className="flex items-center space-x-4">
                 <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                     {/* Your Sun/Moon Icon */}
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
