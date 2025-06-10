import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const TabButton = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`w-1/2 py-3 text-center font-semibold border-b-2 transition-colors ${active ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
        {children}
    </button>
);

const CombinedLoginPage = () => {
  const [activeTab, setActiveTab] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    // ... logic remains the same
    navigate('/user/dashboard'); // Navigate to public dashboard
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    // ... logic remains the same
    navigate('/admin/dashboard'); // Navigate to admin dashboard
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center">Alignzo</h1>
        <div className="flex border-b">
            <TabButton active={activeTab === 'user'} onClick={() => setActiveTab('user')}>User</TabButton>
            <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')}>Admin</TabButton>
        </div>
        {activeTab === 'user' ? (
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full ...">Sign in with Google</button>
        ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full ..."/>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full ..."/>
              <button type="submit" disabled={loading} className="w-full ...">Admin Login</button>
            </form>
        )}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default CombinedLoginPage;
