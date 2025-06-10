import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const NoProjectsPage = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800 text-center">
                <h1 className="text-2xl font-bold dark:text-white">No Projects Assigned</h1>
                <p className="text-gray-600 dark:text-gray-300">
                    You are not currently assigned to any projects. Please contact your administrator to get access.
                </p>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default NoProjectsPage;
