import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

const SettingsCard = ({ title, description, buttonText, onClick }) => (
    <div className="neumorph-outset" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '12px'}}>
        <h3 style={{margin: 0, fontSize: '1.25rem', fontWeight: '600'}} className="text-strong">{title}</h3>
        <p style={{margin: 0, flexGrow: 1}}>{description}</p>
        <button onClick={onClick} className="btn neumorph-outset" style={{alignSelf: 'flex-start', color: 'var(--light-primary)'}}>
            {buttonText}
        </button>
    </div>
);

const Modal = ({ children, onClose }) => (
    <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
        <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative', borderRadius: '12px'}}>
            <button onClick={onClose} className="btn neumorph-outset" style={{position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px'}}>
                &times;
            </button>
            {children}
        </div>
    </div>
);

const SettingsPage = () => {
    const [modal, setModal] = useState(null);
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
    
    // --- Firestore Array Update Logic ---
    const updateFirestoreArray = async (docRef, field, value, operation = 'add') => {
        const payload = operation === 'add' ? { [field]: arrayUnion(value) } : { [field]: arrayRemove(value) };
        try {
            await updateDoc(docRef, payload);
            showMessage(`${field.slice(0, -1)} ${operation === 'add' ? 'added' : 'removed'} successfully!`);
            return true;
        } catch (error) {
            // If the document or field doesn't exist, create it.
            if (error.code === 'not-found' && operation === 'add') {
                try {
                    await setDoc(docRef, { [field]: [value] });
                    showMessage(`${field.slice(0, -1)} added successfully!`);
                    return true;
                } catch (e) {
                    console.error(e);
                    showMessage(`Failed to create and add ${field.slice(0, -1)}.`);
                    return false;
                }
            } else {
                 console.error(error);
                 showMessage(`Failed to ${operation} ${field.slice(0, -1)}.`);
                 return false;
            }
        }
    };

    const handleAddCountry = async (e) => {
        e.preventDefault();
        if (!newCountry.name || !newCountry.code) return;
        const success = await updateFirestoreArray(doc(db, 'settings', 'countries'), 'list', newCountry);
        if (success) setNewCountry({ name: '', code: '' });
    };

    const handleDeleteCountry = async (countryToDelete) => {
        await updateFirestoreArray(doc(db, 'settings', 'countries'), 'list', countryToDelete, 'remove');
    };

    const handleAddDesignation = async (e) => {
        e.preventDefault();
        if (!newDesignation) return;
        const success = await updateFirestoreArray(doc(db, 'settings', 'designations'), 'list', newDesignation);
        if (success) setNewDesignation('');
    };

    const handleDeleteDesignation = async (designationToDelete) => {
        await updateFirestoreArray(doc(db, 'settings', 'designations'), 'list', designationToDelete, 'remove');
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
                    <div>
                        <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">Manage Countries</h2>
                        <form onSubmit={handleAddCountry} style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}>
                            <div className="neumorph-inset" style={{flex: 1}}><input type="text" value={newCountry.name} onChange={(e) => setNewCountry({...newCountry, name: e.target.value})} placeholder="Country Name" className="input-field" /></div>
                            <div className="neumorph-inset" style={{width: '120px'}}><input type="text" value={newCountry.code} onChange={(e) => setNewCountry({...newCountry, code: e.target.value.toUpperCase()})} placeholder="Code" maxLength="3" className="input-field" /></div>
                            <button type="submit" className="btn neumorph-outset" style={{color: 'var(--light-primary)'}}>Add</button>
                        </form>
                        <div style={{maxHeight: '250px', overflowY: 'auto'}}>
                            {countries.map(country => (
                                <div key={country.code} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.1)'}} className="dark:border-b-[rgba(255,255,255,0.1)]">
                                    <span className="text-strong">{country.name} ({country.code})</span>
                                    <button onClick={() => handleDeleteCountry(country)} style={{color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'designations':
                return (
                     <div>
                        <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">Configure Designations</h2>
                        <form onSubmit={handleAddDesignation} style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}>
                            <div className="neumorph-inset" style={{flex: 1}}><input type="text" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder="New Designation Name" className="input-field" /></div>
                            <button type="submit" className="btn neumorph-outset" style={{color: 'var(--light-primary)'}}>Add</button>
                        </form>
                        <div style={{maxHeight: '250px', overflowY: 'auto'}}>
                            {designations.map(d => (
                                <div key={d} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.1)'}} className="dark:border-b-[rgba(255,255,255,0.1)]">
                                    <span className="text-strong">{d}</span>
                                    <button onClick={() => handleDeleteDesignation(d)} style={{color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'password':
                 return (
                    <div>
                        <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">Reset Admin Password</h2>
                        <form onSubmit={handlePasswordReset} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            <div className="neumorph-inset"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="input-field" /></div>
                            <div className="neumorph-inset"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" className="input-field" /></div>
                            <button type="submit" className="btn neumorph-outset" style={{color: 'white', backgroundColor: 'var(--light-primary)'}}>Reset Password</button>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
            <SettingsCard title="Manage Countries" description="Add or remove countries for project mapping." buttonText="Configure" onClick={() => setModal('countries')} />
            <SettingsCard title="Configure Designations" description="Define the roles and hierarchy levels for your team." buttonText="Configure" onClick={() => setModal('designations')} />
            <SettingsCard title="Reset Admin Password" description="Update the password for the currently logged-in admin user." buttonText="Configure" onClick={() => setModal('password')} />
            
            {message && <div style={{position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.5rem', borderRadius: '12px'}} className="neumorph-outset text-primary">{message}</div>}

            {modal && (
                 <Modal onClose={() => setModal(null)}>
                    {renderModalContent()}
                 </Modal>
            )}
        </div>
    );
};

export default SettingsPage;
