import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
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
        <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px'}}>
            <button onClick={onClose} className="btn neumorph-outset" style={{position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px'}}>&times;</button>
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
    const { setIsAppLoading } = useAuth();

    useEffect(() => {
        const fetchSettings = async () => {
            setIsAppLoading(true);
            try {
                const { data, error } = await supabase.from('settings').select('id, value');
                if (error) throw error;

                const countriesSetting = data.find(s => s.id === 'countries');
                const designationsSetting = data.find(s => s.id === 'designations');

                if (countriesSetting) setCountries(countriesSetting.value.list || []);
                if (designationsSetting) setDesignations(designationsSetting.value.list || []);

            } catch (error) {
                console.error("Error fetching settings:", error);
                alert("Could not load settings data.");
            } finally {
                setIsAppLoading(false);
            }
        };
        fetchSettings();
    }, [setIsAppLoading]);

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleAddCountry = async (e) => {
        e.preventDefault();
        if (!newCountry.name || !newCountry.code) return;
        
        setIsAppLoading(true);
        const updatedList = [...countries, newCountry];
        const { error } = await supabase
            .from('settings')
            .update({ value: { list: updatedList } })
            .eq('id', 'countries');
        
        if (error) {
            showMessage('Failed to add country.');
            console.error(error);
        } else {
            setCountries(updatedList); // Optimistically update state
            setNewCountry({ name: '', code: '' });
            showMessage('Country added successfully!');
        }
        setIsAppLoading(false);
    };

    const handleDeleteCountry = async (countryToDelete) => {
        setIsAppLoading(true);
        const updatedList = countries.filter(c => c.code !== countryToDelete.code);
        const { error } = await supabase
            .from('settings')
            .update({ value: { list: updatedList } })
            .eq('id', 'countries');

        if (error) {
            showMessage('Failed to delete country.');
            console.error(error);
        } else {
            setCountries(updatedList);
            showMessage('Country deleted successfully!');
        }
        setIsAppLoading(false);
    };

    const handleAddDesignation = async (e) => {
        e.preventDefault();
        if (!newDesignation) return;
        setIsAppLoading(true);
        const updatedList = [...designations, newDesignation];
        const { error } = await supabase
            .from('settings')
            .update({ value: { list: updatedList } })
            .eq('id', 'designations');
        
        if (error) {
            showMessage('Failed to add designation.');
            console.error(error);
        } else {
            setDesignations(updatedList);
            setNewDesignation('');
            showMessage('Designation added successfully!');
        }
        setIsAppLoading(false);
    };

    const handleDeleteDesignation = async (designationToDelete) => {
        setIsAppLoading(true);
        const updatedList = designations.filter(d => d !== designationToDelete);
         const { error } = await supabase
            .from('settings')
            .update({ value: { list: updatedList } })
            .eq('id', 'designations');
            
        if (error) {
            showMessage('Failed to delete designation.');
            console.error(error);
        } else {
            setDesignations(updatedList);
            showMessage('Designation deleted successfully!');
        }
        setIsAppLoading(false);
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { showMessage('Passwords do not match.'); return; }
        if (newPassword.length < 6) { showMessage('Password should be at least 6 characters.'); return; }
        setIsAppLoading(true);
        try {
            await updatePassword(auth.currentUser, newPassword);
            setNewPassword('');
            setConfirmPassword('');
            showMessage('Password updated successfully!');
            setModal(null);
        } catch (error) { console.error(error); showMessage('Failed to update password. You may need to re-login.'); }
        finally { setIsAppLoading(false); }
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
                            <button type="submit" className="btn neumorph-outset btn-primary">Reset Password</button>
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
