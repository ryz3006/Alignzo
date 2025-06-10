import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, query, where, getDocs } from 'firebase/firestore';

// --- (MultiSelectDropdown component code is unchanged) ---
const MultiSelectDropdown = ({ options, selected, onSelectionChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const filteredOptions = useMemo(() => options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase())), [options, searchTerm]);
    const handleToggleOption = (optionValue) => {
        const newSelection = selected.includes(optionValue) ? selected.filter(item => item !== optionValue) : [...selected, optionValue];
        onSelectionChange(newSelection);
    };
    const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ');
    return (
        <div className="relative">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex justify-between items-center">
                <span className="truncate pr-2">{selectedLabels || placeholder}</span>
                <span>&#9662;</span>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border-b dark:bg-gray-600 dark:border-gray-500" />
                    {filteredOptions.map(option => (
                        <div key={option.value} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center">
                           <input type="checkbox" checked={selected.includes(option.value)} onChange={() => handleToggleOption(option.value)} className="mr-2"/>
                           {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const projectOptions = useMemo(() => projects.map(p => ({ label: p.name, value: p.id })), [projects]);
  const projectMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}), [projects]);
  
  const defaultNewUser = { email: '', contactNumber: '', designation: designations.length > 0 ? designations[0] : '', reportingTo: '', mappedProjects: [] };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), snap => { setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))); setLoading(false); });
    const unsubProjects = onSnapshot(collection(db, "projects"), snap => setProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubDesignations = onSnapshot(doc(db, 'settings', 'designations'), d => setDesignations(d.exists() ? d.data().list : []));
    return () => { unsubUsers(); unsubProjects(); unsubDesignations(); };
  }, []);
  
  // ... (Hierarchical functions remain the same)

  const openAddUserModal = () => { setIsEditing(false); setCurrentUser(defaultNewUser); setIsModalOpen(true); };
  const openEditModal = (user) => { setIsEditing(true); setCurrentUser({ ...user, mappedProjects: user.mappedProjects || [] }); setIsModalOpen(true); };
  
  const handleFormSubmit = async (e) => { e.preventDefault(); isEditing ? await handleEditUser() : await handleAddUser(); };

  const handleAddUser = async () => {
      if (!currentUser.email) return alert("Email is required.");
      try {
        // Use the user's email as the document ID
        await setDoc(doc(db, "users", currentUser.email), {
            email: currentUser.email,
            contactNumber: currentUser.contactNumber,
            displayName: currentUser.email.split('@')[0],
            designation: currentUser.designation,
            reportingTo: currentUser.reportingTo,
            mappedProjects: currentUser.mappedProjects,
            isAdmin: false,
            createdAt: serverTimestamp()
        });
        
        alert(`User record for ${currentUser.email} created.`);
        setIsModalOpen(false);
      } catch (error) { console.error(error); alert("Failed to add user."); }
  };

  const handleEditUser = async () => {
    // ... (This function remains largely the same but operates on doc(db, "users", currentUser.id))
  };

  const handleDeleteUser = async (userEmail, userDisplayName) => {
    // ... (This function remains the same but operates on doc(db, "users", userEmail))
  }
  
  // ... (rest of the component remains the same)

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {/* ... table and search ... */}
      </div>
      
      {isModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          {/* ... modal JSX remains the same ... */}
        </div>
      )}
    </>
  );
};

export default UserManagementPage;
