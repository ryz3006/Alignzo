import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

const SettingsCard = ({ title, buttonText, onClick }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h3>
        <button onClick={onClick} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Configure
        </button>
    </div>
);

const SettingsPage = () => {
    const [modal, setModal] = useState(null); // 'countries', 'designations', 'password'
    const [countries, setCountries] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [newCountry, setNewCountry] = useState({ name: '', code: '' });
    const [newDesignation, setNewDesignation] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const countryUnsub = onSnapshot(doc(db, 'settings', 'countries'), (doc) => {
            if (doc.exists()) setCountries(doc.data().list || []);
        });
        const designationUnsub = onSnapshot(doc(db, 'settings', 'designations'), (doc) => {
            if (doc.exists()) setDesignations(doc.data().list || []);
        });
        return () => {
            countryUnsub();
            designationUnsub();
        };
    }, []);

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleAddCountry = async (e) => {
        e.preventDefault();
        if (!newCountry.name || !newCountry.code) return;
        const updatedList = [...countries, newCountry];
        try {
            await setDoc(doc(db, 'settings', 'countries'), { list: updatedList }, { merge: true });
            setNewCountry({ name: '', code: '' });
            showMessage('Country added successfully!');
        } catch (error) { console.error(error); showMessage('Failed to add country.'); }
    };

    const handleDeleteCountry = async (codeToDelete) => {
        const updatedList = countries.filter(c => c.code !== codeToDelete);
        try {
            await setDoc(doc(db, 'settings', 'countries'), { list: updatedList });
            showMessage('Country deleted successfully!');
        } catch (error) { console.error(error); showMessage('Failed to delete country.'); }
    };

    const handleAddDesignation = async (e) => {
        e.preventDefault();
        if (!newDesignation) return;
        const updatedList = [...designations, newDesignation];
        try {
            await setDoc(doc(db, 'settings', 'designations'), { list: updatedList }, { merge: true });
            setNewDesignation('');
            showMessage('Designation added successfully!');
        } catch (error) { console.error(error); showMessage('Failed to add designation.'); }
    };

    const handleDeleteDesignation = async (designationToDelete) => {
        const updatedList = designations.filter(d => d !== designationToDelete);
        try {
            await setDoc(doc(db, 'settings', 'designations'), { list: updatedList });
            showMessage('Designation deleted successfully!');
        } catch (error) { console.error(error); showMessage('Failed to delete designation.'); }
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { showMessage('Passwords do not match.'); return; }
        if (newPassword.length < 6) { showMessage('Password should be at least 6 characters.'); return; }
        try {
            await updatePassword(auth.currentUser, newPassword);
            setNewPassword('');
            setConfirmPassword('');
            showMessage('Password updated successfully!');
            setModal(null);
        } catch (error) { console.error(error); showMessage('Failed to update password. You may need to re-login.'); }
    };

    const renderModalContent = () => {
        switch (modal) {
            case 'countries':
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Manage Countries</h2>
                        <form onSubmit={handleAddCountry} className="flex items-center gap-4 mb-4">
                            <input type="text" value={newCountry.name} onChange={(e) => setNewCountry({...newCountry, name: e.target.value})} placeholder="Country Name" className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            <input type="text" value={newCountry.code} onChange={(e) => setNewCountry({...newCountry, code: e.target.value.toUpperCase()})} placeholder="3-Letter Code" maxLength="3" className="w-32 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                        </form>
                        <div className="overflow-y-auto max-h-60">
                            {countries.map(country => (
                                <div key={country.code} className="flex justify-between items-center p-2 border-b dark:border-gray-700">
                                    <span className="dark:text-gray-300">{country.name} ({country.code})</span>
                                    <button onClick={() => handleDeleteCountry(country.code)} className="text-red-500 hover:text-red-700">Delete</button>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 'designations':
                return (
                     <>
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Configure Designations</h2>
                        <form onSubmit={handleAddDesignation} className="flex items-center gap-4 mb-4">
                            <input type="text" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder="New Designation" className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                        </form>
                        <div className="overflow-y-auto max-h-60">
                            {designations.map(d => (
                                <div key={d} className="flex justify-between items-center p-2 border-b dark:border-gray-700">
                                    <span className="dark:text-gray-300">{d}</span>
                                    <button onClick={() => handleDeleteDesignation(d)} className="text-red-500 hover:text-red-700">Delete</button>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 'password':
                 return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">Reset Admin Password</h2>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Reset Password</button>
                        </form>
                    </>
                );
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6">
            <SettingsCard title="Manage Countries" buttonText="Configure" onClick={() => setModal('countries')} />
            <SettingsCard title="Configure Designations" buttonText="Configure" onClick={() => setModal('designations')} />
            <SettingsCard title="Reset Admin Password" buttonText="Configure" onClick={() => setModal('password')} />
            
            {message && <div className="fixed bottom-10 right-10 p-3 bg-green-100 text-green-800 rounded dark:bg-green-900/50 dark:text-green-300 shadow-lg">{message}</div>}

            {modal && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg relative">
                         <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white text-2xl">&times;</button>
                        {renderModalContent()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
