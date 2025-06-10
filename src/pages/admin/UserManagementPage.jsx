import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const MultiSelectDropdown = ({ options, selected, onSelectionChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = useMemo(() => 
        options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        ), [options, searchTerm]);

    const handleToggleOption = (optionValue) => {
        const newSelection = selected.includes(optionValue)
            ? selected.filter(item => item !== optionValue)
            : [...selected, optionValue];
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
                    <input 
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border-b dark:bg-gray-600 dark:border-gray-500"
                    />
                    {filteredOptions.map(option => (
                        <div key={option.value} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center">
                           <input 
                                type="checkbox"
                                checked={selected.includes(option.value)}
                                onChange={() => handleToggleOption(option.value)}
                                className="mr-2"
                           />
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const projectOptions = useMemo(() => projects.map(p => ({ label: p.name, value: p.id })), [projects]);
  const projectMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}), [projects]);
  
  const defaultNewUser = { email: '', contactNumber: '', designation: designations.length > 0 ? designations[0] : '', reportingTo: '', mappedProjects: [] };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubProjects = onSnapshot(collection(db, "projects"), snap => setProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubDesignations = onSnapshot(doc(db, 'settings', 'designations'), d => setDesignations(d.exists() ? d.data().list : []));
    setLoading(false);
    return () => { unsubUsers(); unsubProjects(); unsubDesignations(); };
  }, []);
  
  const getAllSubordinates = (userId, allUsers) => {
    let subordinates = [];
    let queue = [userId];
    while (queue.length > 0) {
      const managerId = queue.shift();
      const directReports = allUsers.filter(u => u.reportingTo === managerId);
      subordinates.push(...directReports);
      queue.push(...directReports.map(r => r.id));
    }
    return subordinates;
  };
  
  const getAllManagers = (userId, allUsers) => {
      let managers = [];
      let current = allUsers.find(u => u.id === userId);
      while(current && current.reportingTo) {
          const manager = allUsers.find(u => u.id === current.reportingTo);
          if(manager) {
              managers.push(manager);
              current = manager;
          } else {
              break;
          }
      }
      return managers;
  };

  const openAddUserModal = () => { setIsEditing(false); setCurrentUser(defaultNewUser); setIsModalOpen(true); };
  const openEditModal = (user) => { setIsEditing(true); setCurrentUser({ ...user, mappedProjects: user.mappedProjects || [] }); setIsModalOpen(true); };
  
  const handleFormSubmit = async (e) => { e.preventDefault(); isEditing ? await handleEditUser() : await handleAddUser(); };

  const handleAddUser = async () => {
      if (!currentUser.email) return alert("Email is required.");
      try {
        const docRef = await addDoc(collection(db, "users"), {
            email: currentUser.email,
            contactNumber: currentUser.contactNumber,
            displayName: currentUser.email.split('@')[0],
            designation: currentUser.designation,
            reportingTo: currentUser.reportingTo,
            mappedProjects: currentUser.mappedProjects,
            isAdmin: false,
            createdAt: serverTimestamp()
        });

        const newUser = { id: docRef.id, ...currentUser };
        const managers = getAllManagers(newUser.id, [...users, newUser]);
        
        const batch = writeBatch(db);
        managers.forEach(manager => {
            const managerRef = doc(db, 'users', manager.id);
            const newProjectsForManager = new Set([...(manager.mappedProjects || []), ...currentUser.mappedProjects]);
            batch.update(managerRef, { mappedProjects: Array.from(newProjectsForManager) });
        });
        await batch.commit();
        
        alert(`User record for ${currentUser.email} created.`);
        setIsModalOpen(false);
      } catch (error) { console.error(error); alert("Failed to add user."); }
  };

  const handleEditUser = async () => {
    if (!currentUser) return;
    
    const originalUser = users.find(u => u.id === currentUser.id);
    if (!originalUser) return alert("Could not find original user data.");

    const originalProjects = new Set(originalUser.mappedProjects || []);
    const newProjects = new Set(currentUser.mappedProjects || []);
    const removedProjects = [...originalProjects].filter(p => !newProjects.has(p));

    if (removedProjects.length > 0) {
        const subordinates = getAllSubordinates(currentUser.id, users);
        for (const projectId of removedProjects) {
            for (const subordinate of subordinates) {
                if ((subordinate.mappedProjects || []).includes(projectId)) {
                    const projectName = projectMap[projectId] || 'Unknown Project';
                    alert(`Cannot unmap from "${projectName}". Subordinate "${subordinate.displayName || subordinate.email}" is still mapped to it.`);
                    return;
                }
            }
        }
    }

    try {
        const userRef = doc(db, "users", currentUser.id);
        const batch = writeBatch(db);

        batch.update(userRef, {
            contactNumber: currentUser.contactNumber,
            designation: currentUser.designation,
            reportingTo: currentUser.reportingTo,
            mappedProjects: currentUser.mappedProjects,
        });

        const managers = getAllManagers(currentUser.id, users);
        managers.forEach(manager => {
            const managerRef = doc(db, 'users', manager.id);
            const newProjectsForManager = new Set([...(manager.mappedProjects || []), ...currentUser.mappedProjects]);
            batch.update(managerRef, { mappedProjects: Array.from(newProjectsForManager) });
        });

        await batch.commit();
        setIsModalOpen(false);
    } catch(error) { console.error(error); alert("Failed to update user."); }
  };

  const handleDeleteUser = async (userId, userDisplayName) => {
    const projectsOwnedQuery = query(collection(db, "projects"), where("ownerId", "==", userId));
    const ownedProjectsSnap = await getDocs(projectsOwnedQuery);
    if (!ownedProjectsSnap.empty) {
        alert(`Cannot delete user. They are the owner of project(s). Please change the owner first.`);
        return;
    }

    const subordinatesQuery = query(collection(db, "users"), where("reportingTo", "==", userId));
    const subordinatesSnap = await getDocs(subordinatesQuery);
    if(!subordinatesSnap.empty) {
        alert(`Cannot delete user. Other users report to them. Please reassign their manager first.`);
        return;
    }

    if(window.confirm(`Are you sure you want to delete ${userDisplayName}?`)) {
        try {
            await deleteDoc(doc(db, "users", userId));
            alert("User record deleted.");
        } catch(error) { console.error(error); alert("Failed to delete user."); }
    }
  }
  
  const handleUserInputChange = (e) => {
      const { name, value } = e.target;
      setCurrentUser(prev => ({ ...prev, [name]: value }));
  }
  
  const handleProjectSelectionChange = (selection) => {
    setCurrentUser(prev => ({ ...prev, mappedProjects: selection }));
  }

  const filteredUsers = users.filter(u => (u.displayName || u.email).toLowerCase().includes(searchTerm.toLowerCase()));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
           <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-1/3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button onClick={openAddUserModal} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">+ Add User</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800">
             <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mapped Projects</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && <tr><td colSpan="4" className="text-center py-4 dark:text-gray-300">Loading users...</td></tr>}
              {!loading && paginatedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.displayName || user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.designation || 'Not Set'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {(user.mappedProjects || []).map(pId => projectMap[pId]).join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">Edit</button>
                    <button onClick={() => handleDeleteUser(user.id, user.displayName || user.email)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-300 rounded-md disabled:opacity-50">Previous</button>
            <span>Page {currentPage} of {Math.ceil(filteredUsers.length / itemsPerPage)}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredUsers.length / itemsPerPage)))} disabled={currentPage * itemsPerPage >= filteredUsers.length} className="px-4 py-2 bg-gray-300 rounded-md disabled:opacity-50">Next</button>
        </div>
      </div>
      
      {isModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6 dark:text-white">{isEditing ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <input type="email" name="email" value={currentUser.email} onChange={handleUserInputChange} placeholder="Email" required className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600" disabled={isEditing}/>
                <input type="text" name="contactNumber" value={currentUser.contactNumber || ''} onChange={handleUserInputChange} placeholder="Contact Number (Optional)" className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600"/>
                <div>
                    <label className="block mb-1 font-medium dark:text-gray-300">Designation</label>
                    <select name="designation" value={currentUser.designation} onChange={handleUserInputChange} className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        {designations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block mb-1 font-medium dark:text-gray-300">Reporting To</label>
                    <select name="reportingTo" value={currentUser.reportingTo} onChange={handleUserInputChange} className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">None</option>
                        {users.filter(u => u.id !== currentUser.id && u.reportingTo !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block mb-1 font-medium dark:text-gray-300">Mapped Projects</label>
                    <MultiSelectDropdown 
                        options={projectOptions}
                        selected={currentUser.mappedProjects}
                        onSelectionChange={handleProjectSelectionChange}
                        placeholder="Select projects..."
                    />
                </div>
              <div className="flex justify-end mt-6 space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 dark:text-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">{isEditing ? 'Save Changes' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagementPage;
