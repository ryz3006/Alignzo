import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';

const MultiSelectDropdown = ({ options, selected, onSelectionChange, placeholder }) => {
    // ... (MultiSelectDropdown component code from UserManagementPage)
};

const DocumentRepositoryPage = () => {
    const [documents, setDocuments] = useState([]);
    const [modules, setModules] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDoc, setCurrentDoc] = useState(null);
    const { setIsAppLoading } = useAuth();
    const { selectedProject } = useProject();
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');

    const defaultNewDoc = { name: '', description: '', link: '', modules: [] };

    useEffect(() => {
        if (!selectedProject) return;
        setIsAppLoading(true);

        const docRef = collection(db, 'projects', selectedProject.id, 'documents');
        const unsubDocs = onSnapshot(docRef, snap => {
            setDocuments(snap.docs.map(d => ({id: d.id, ...d.data()})));
            setIsAppLoading(false);
        });
        
        const settingsRef = doc(db, 'projects', selectedProject.id, 'settings', 'modules');
        const unsubModules = onSnapshot(settingsRef, docSnap => {
            setModules(docSnap.exists() ? docSnap.data().list : []);
        });

        return () => { unsubDocs(); unsubModules(); };
    }, [selectedProject, setIsAppLoading]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentDoc(prev => ({ ...prev, [name]: value }));
    };

    const handleModuleSelection = (selection) => {
        setCurrentDoc(prev => ({...prev, modules: selection}));
    };

    const openCreateModal = () => { setIsEditing(false); setCurrentDoc(defaultNewDoc); setIsModalOpen(true); };
    const openEditModal = (doc) => { setIsEditing(true); setCurrentDoc({...doc, modules: doc.modules || []}); setIsModalOpen(true); };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!currentDoc.name || !currentDoc.link) return alert("Document Name and Link are required.");
        
        setIsAppLoading(true);
        try {
            const collectionRef = collection(db, 'projects', selectedProject.id, 'documents');
            if (isEditing) {
                const docRef = doc(collectionRef, currentDoc.id);
                await updateDoc(docRef, currentDoc);
            } else {
                await addDoc(collectionRef, {...currentDoc, createdAt: serverTimestamp()});
            }
            setIsModalOpen(false);
        } catch (error) { console.error("Error saving document:", error); }
        finally { setIsAppLoading(false); }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this document?")) {
            setIsAppLoading(true);
            try {
                await deleteDoc(doc(db, 'projects', selectedProject.id, 'documents', id));
            } catch (error) { console.error("Error deleting document:", error); }
            finally { setIsAppLoading(false); }
        }
    };
    
    const filteredDocuments = documents.filter(doc => 
        (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (moduleFilter ? (doc.modules || []).includes(moduleFilter) : true)
    );

    return (
        <div className="neumorph-outset" style={{padding: '1.5rem', borderRadius: '12px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1}}>
                    <input type="text" placeholder="Search by name or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{minWidth: '250px'}} />
                </div>
                <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px'}}>
                    <select onChange={(e) => setModuleFilter(e.target.value)} value={moduleFilter} className="input-field">
                        <option value="">Filter by Module...</option>
                        {modules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <button onClick={openCreateModal} className="btn neumorph-outset" style={{color: 'var(--light-primary)', fontWeight: '600'}}>+ Add Document</button>
            </div>
            
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
                    <thead>
                        {/* Table Headers */}
                    </thead>
                    <tbody>
                        {filteredDocuments.map(doc => (
                            <tr key={doc.id} className="neumorph-outset" style={{borderRadius: '12px'}}>
                                <td style={{padding: '1rem'}} className="text-strong">{doc.name}</td>
                                <td style={{padding: '1rem'}}><a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-primary">Open Link</a></td>
                                <td style={{padding: '1rem'}}>{(doc.modules || []).join(', ')}</td>
                                <td style={{padding: '1rem', textAlign: 'right'}}>
                                    <button onClick={() => openEditModal(doc)} style={{marginRight: '1rem', border: 'none', background: 'transparent', cursor: 'pointer'}}><span className="text-primary">&#9998;</span></button>
                                    <button onClick={() => handleDelete(doc.id)} style={{color: '#e53e3e', border: 'none', background: 'transparent', cursor: 'pointer'}}>&#128465;</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                // ... Modal JSX with form fields ...
            )}
        </div>
    );
};

export default DocumentRepositoryPage;
