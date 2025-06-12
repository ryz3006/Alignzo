import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';

// --- Reusable MultiSelect Dropdown Component ---
const MultiSelectDropdown = ({ options, selected, onSelectionChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Ensure options is always an array to prevent .filter error
    const safeOptions = options || [];

    const filteredOptions = useMemo(() => 
        safeOptions.filter(option => 
            option.toLowerCase().includes(searchTerm.toLowerCase())
        ), [safeOptions, searchTerm]);

    const handleToggleOption = (optionValue) => {
        const newSelection = selected.includes(optionValue)
            ? selected.filter(item => item !== optionValue)
            : [...selected, optionValue];
        onSelectionChange(newSelection);
    };
    
    const selectedLabels = selected.join(', ');

    return (
        <div style={{position: 'relative'}}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="input-field neumorph-inset" style={{width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem'}}>{selectedLabels || placeholder}</span>
                <span>&#9662;</span>
            </button>
            {isOpen && (
                <div className="neumorph-outset" style={{position: 'absolute', zIndex: 60, width: '100%', marginTop: '0.5rem', maxHeight: '240px', overflowY: 'auto', borderRadius: '12px'}}>
                    <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '0', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <input 
                            type="text"
                            placeholder="Search modules..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{padding: '0.75rem', borderBottom: '2px solid var(--light-bg)'}}
                        />
                    </div>
                    {filteredOptions.map(option => (
                        <div key={option} onClick={() => handleToggleOption(option)} style={{padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                           <input 
                                type="checkbox"
                                readOnly
                                checked={selected.includes(option)}
                                style={{marginRight: '0.75rem'}}
                           />
                           {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const defaultNewDoc = { name: '', description: '', link: '', modules: [] };

    useEffect(() => {
        if (!selectedProject) return;
        setIsAppLoading(true);

        const docRef = collection(db, 'projects', selectedProject.id, 'documents');
        const unsubDocs = onSnapshot(docRef, snap => {
            setDocuments(snap.docs.map(d => ({id: d.id, ...d.data()})));
            setIsAppLoading(false);
        }, (error) => {
            console.error("Error fetching documents:", error);
            setIsAppLoading(false);
        });
        
        // Corrected logic: The settings for modules are on the project document itself.
        const projectDocRef = doc(db, 'projects', selectedProject.id);
        const unsubModules = onSnapshot(projectDocRef, docSnap => {
            // This now safely handles a missing 'modules' field by defaulting to an empty array.
            setModules(docSnap.exists() ? (docSnap.data().modules || []) : []);
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
                const { id, ...dataToUpdate } = currentDoc;
                await updateDoc(docRef, dataToUpdate);
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
    
    const filteredDocuments = useMemo(() => documents.filter(doc => 
        (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
        (moduleFilter ? (doc.modules || []).includes(moduleFilter) : true)
    ), [documents, searchTerm, moduleFilter]);

    const paginatedDocuments = useMemo(() => filteredDocuments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredDocuments, currentPage]);
    const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

    if (!selectedProject) {
        return <div className="text-strong text-center p-8 neumorph-outset rounded-lg">Please select a project from your dashboard to view documents.</div>
    }

    return (
        <>
            <div className="neumorph-outset" style={{padding: '1.5rem', borderRadius: '12px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                   <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1}}>
                     <input
                      type="text"
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field"
                      style={{minWidth: '250px'}}
                    />
                   </div>
                   <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px'}}>
                     <select onChange={(e) => setModuleFilter(e.target.value)} value={moduleFilter} className="input-field">
                        <option value="">Filter by Module...</option>
                        {modules.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                   </div>
                  <button onClick={openCreateModal} className="btn neumorph-outset" style={{color: '#28a745', fontWeight: '600'}}>+ Add Document</button>
                </div>
                
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
                        <thead>
                            <tr>
                                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Document Name</th>
                                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Link</th>
                                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Modules</th>
                                <th style={{padding: '0.75rem', textAlign: 'right'}} className="text-strong">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDocuments.map(docData => (
                                <tr key={docData.id} className="neumorph-outset" style={{borderRadius: '12px'}}>
                                    <td style={{padding: '1rem'}} className="text-strong">{docData.name}</td>
                                    <td style={{padding: '1rem'}}><a href={docData.link} target="_blank" rel="noopener noreferrer" className="text-primary" style={{textDecoration: 'underline'}}>Open Link</a></td>
                                    <td style={{padding: '1rem'}}>{(docData.modules || []).join(', ')}</td>
                                    <td style={{padding: '1rem', textAlign: 'right'}}>
                                        <button onClick={() => openEditModal(docData)} style={{marginRight: '1rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem'}}>&#9998;</button>
                                        <button onClick={() => handleDelete(docData.id)} style={{color: '#e53e3e', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem'}}>&#128465;</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem'}}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="btn neumorph-outset" style={{opacity: currentPage === 1 ? 0.5 : 1}}>Previous</button>
                    <span className="text-strong">Page {currentPage} of {totalPages > 0 ? totalPages : 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="btn neumorph-outset" style={{opacity: currentPage >= totalPages ? 0.5 : 1}}>Next</button>
                </div>
            </div>

            {isModalOpen && currentDoc && (
                <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
                    <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'}}>
                        <button onClick={() => setIsModalOpen(false)} className="btn neumorph-outset" style={{position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px'}}>&times;</button>
                        <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">{isEditing ? 'Edit Document' : 'Add New Document'}</h2>
                        <form onSubmit={handleFormSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                            <div className="neumorph-inset"><input type="text" name="name" value={currentDoc.name || ''} onChange={handleInputChange} placeholder="Document Name" required className="input-field"/></div>
                            <div className="neumorph-inset"><textarea name="description" value={currentDoc.description || ''} onChange={handleInputChange} placeholder="Description" className="input-field" style={{height: '80px'}}></textarea></div>
                            <div className="neumorph-inset"><input type="url" name="link" value={currentDoc.link || ''} onChange={handleInputChange} placeholder="https://example.com/document" required className="input-field"/></div>
                            <div>
                                <label className="text-strong" style={{marginBottom: '0.5rem', display: 'block'}}>Modules</label>
                                <MultiSelectDropdown 
                                    options={modules}
                                    selected={currentDoc.modules || []}
                                    onSelectionChange={handleModuleSelection}
                                    placeholder="Select modules..."
                                />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem'}}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn neumorph-outset">Cancel</button>
                                <button type="submit" className="btn neumorph-outset" style={{color: 'white', backgroundColor: 'var(--light-primary)'}}>{isEditing ? 'Save Changes' : 'Add Document'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default DocumentRepositoryPage;
