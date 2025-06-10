import React from 'react';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  // We will build the full sidebar and header later
  return (
    <div>
      <header className="bg-red-800 text-white p-4">
        <h1>Admin Panel</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
