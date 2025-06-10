import React from 'react';
import { NavLink } from 'react-router-dom';
import LogoWithName from '../../assets/images/Logo_with_Name.png';

const Sidebar = ({ navItems }) => {
    return (
        <aside className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white w-64 space-y-6 py-7 px-2">
            <a href="#" className="text-2xl font-bold px-4 flex items-center">
                <img src={LogoWithName} alt="Alignzo Logo" className="h-10 w-auto" />
            </a>
            <nav>
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) => `flex items-center p-3 my-1 rounded-lg transition-colors ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
                    >
                        <span className="mx-4 font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
