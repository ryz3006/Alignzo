import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  // We will build the full sidebar and header later
  return (
    <div>
      <header className="bg-green-800 text-white p-4">
        <h1>Alignzo User Dashboard</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
