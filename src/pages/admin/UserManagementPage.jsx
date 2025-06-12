import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

// --- Reusable MultiSelect Dropdown Component ---
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
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{padding: '0.75rem', borderBottom: '2px solid var(--light-bg)'}}
                        />
                    </div>
                    {filteredOptions.map(option => (
                        <div key={option.value} onClick={() => handleToggleOption(option.value)} style={{padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                           <input 
                                type="checkbox"
                                readOnly
                                checked={selected.includes(option.value)}
                                style={{marginRight: '0.75rem'}}
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
  const [reportingToFilter, setReportingToFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const projectOptions = useMemo(() => projects.map(p => ({ label: p.name, value: p.id })), [projects]);
  const projectMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}), [projects]);
  
  const defaultNewUser = { email: '', displayName: '', contactNumber: '', designation: designations.length > 0 ? designations[0] : '', reportingTo: '', mappedProjects: [] };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
        const usersData = snap.docs.map(d => ({id: d.id, ...d.data()}));
        const getSortOrder = (designation) => designations.indexOf(designation);
        usersData.sort((a, b) => getSortOrder(a.designation) - getSortOrder(b.designation));
        setUsers(usersData);
        setLoading(false);
    });
    const unsubProjects = onSnapshot(collection(db, "projects"), snap => setProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubDesignations = onSnapshot(doc(db, 'settings', 'designations'), d => setDesignations(d.exists() ? d.data().list : []));
    return () => { unsubUsers(); unsubProjects(); unsubDesignations(); };
  }, [designations]);
  
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
      if (!currentUser.email || !currentUser.displayName) return alert("Email and Full Name are required.");
      
      const nameQuery = query(collection(db, "users"), where("displayName", "==", currentUser.displayName));
      const nameSnap = await getDocs(nameQuery);
      if(!nameSnap.empty) return alert("A user with this display name already exists.");

      try {
        await setDoc(doc(db, "users", currentUser.email), {
            email: currentUser.email,
            displayName: currentUser.displayName,
            contactNumber: currentUser.contactNumber || '',
            designation: currentUser.designation,
            reportingTo: currentUser.reportingTo,
            mappedProjects: currentUser.mappedProjects,
            isAdmin: false,
            createdAt: serverTimestamp()
        });
        
        const tempNewUser = { id: currentUser.email, ...currentUser };
        const managers = getAllManagers(tempNewUser.id, [...users, tempNewUser]);
        
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
            displayName: currentUser.displayName,
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

  const handleDeleteUser = async (userEmail, userDisplayName) => {
    const projectsOwnedQuery = query(collection(db, "projects"), where("ownerId", "==", userEmail));
    const ownedProjectsSnap = await getDocs(projectsOwnedQuery);
    if (!ownedProjectsSnap.empty) {
        alert(`Cannot delete user. They are the owner of project(s). Please change the owner first.`);
        return;
    }

    const subordinatesQuery = query(collection(db, "users"), where("reportingTo", "==", userEmail));
    const subordinatesSnap = await getDocs(subordinatesQuery);
    if(!subordinatesSnap.empty) {
        alert(`Cannot delete user. Other users report to them. Please reassign their manager first.`);
        return;
    }

    if(window.confirm(`Are you sure you want to delete ${userDisplayName}?`)) {
        try {
            await deleteDoc(doc(db, "users", userEmail));
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

  const filteredUsers = users.filter(u => 
      ((u.displayName || u.email).toLowerCase().includes(searchTerm.toLowerCase())) &&
      (reportingToFilter ? u.reportingTo === reportingToFilter : true)
  );
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <>
      <div className="neumorph-outset" style={{padding: '1.5rem', borderRadius: '12px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
           <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1}}>
             <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{minWidth: '250px'}}
            />
           </div>
           <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px'}}>
             <select onChange={(e) => setReportingToFilter(e.target.value)} value={reportingToFilter} className="input-field">
                <option value="">Filter by Manager...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
             </select>
           </div>
          <button onClick={openAddUserModal} className="btn neumorph-outset" style={{color: '#28a745', fontWeight: '600'}}>+ Add User</button>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
             <thead>
              <tr>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Name</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Designation</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Mapped Projects</th>
                <th style={{padding: '0.75rem', textAlign: 'right'}} className="text-strong">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4" style={{textAlign: 'center', padding: '1rem'}}>Loading users...</td></tr>}
              {!loading && paginatedUsers.map(user => (
                <tr key={user.id} className="neumorph-outset" style={{borderRadius: '12px'}}>
                  <td style={{padding: '1rem'}}>{user.displayName || user.email}</td>
                  <td style={{padding: '1rem'}}>{user.designation || 'Not Set'}</td>
                  <td style={{padding: '1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {(user.mappedProjects || []).map(pId => projectMap[pId]).join(', ')}
                  </td>
                  <td style={{padding: '1rem', textAlign: 'right'}}>
                    <button onClick={() => openEditModal(user)} style={{marginRight: '1rem', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer'}} className="text-primary">Edit</button>
                    <button onClick={() => handleDeleteUser(user.id, user.displayName || user.email)} style={{fontWeight: 600, color: '#e53e3e', border: 'none', background: 'transparent', cursor: 'pointer'}}>Delete</button>
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
      
      {isModalOpen && currentUser && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
          <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'}}>
            <button onClick={() => setIsModalOpen(false)} className="btn neumorph-outset" style={{position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px'}}>&times;</button>
            <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">{isEditing ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleFormSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div className="neumorph-inset"><input type="email" name="email" value={currentUser.email} onChange={handleUserInputChange} placeholder="Email" required className="input-field" disabled={isEditing}/></div>
                <div className="neumorph-inset"><input type="text" name="displayName" value={currentUser.displayName || ''} onChange={handleUserInputChange} placeholder="Full Name" required className="input-field"/></div>
                <div className="neumorph-inset"><input type="text" name="contactNumber" value={currentUser.contactNumber || ''} onChange={handleUserInputChange} placeholder="Contact Number (Optional)" className="input-field"/></div>
                <div>
                    <label className="text-strong" style={{marginBottom: '0.5rem', display: 'block'}}>Designation</label>
                    <div className="neumorph-inset"><select name="designation" value={currentUser.designation} onChange={handleUserInputChange} className="input-field">
                        {designations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select></div>
                </div>
                 <div>
                    <label className="text-strong" style={{marginBottom: '0.5rem', display: 'block'}}>Reporting To</label>
                    <div className="neumorph-inset"><select name="reportingTo" value={currentUser.reportingTo} onChange={handleUserInputChange} className="input-field">
                        <option value="">None</option>
                        {users.filter(u => u.id !== currentUser.id && u.reportingTo !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
                    </select></div>
                </div>
                <div>
                    <label className="text-strong" style={{marginBottom: '0.5rem', display: 'block'}}>Mapped Projects</label>
                    <MultiSelectDropdown 
                        options={projectOptions}
                        selected={currentUser.mappedProjects}
                        onSelectionChange={handleProjectSelectionChange}
                        placeholder="Select projects..."
                    />
                </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem'}}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn neumorph-outset">Cancel</button>
                <button type="submit" className="btn neumorph-outset" style={{color: 'white', backgroundColor: 'var(--light-primary)'}}>{isEditing ? 'Save Changes' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagementPage;
