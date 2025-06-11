import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// --- Static Data for Dropdowns ---
const amcMsoOptions = ["Not Applicable", "AMC", "MSO"];

// --- Main Project Management Page Component ---
const ProjectManagementPage = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countryOptions, setCountryOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const userMap = useMemo(() => users.reduce((acc, user) => ({ ...acc, [user.id]: user.displayName || user.email }), {}), [users]);

  useEffect(() => {
    const projUnsub = onSnapshot(collection(db, 'projects'), snap => {
        setProjects(snap.docs.map(d => ({id: d.id, ...d.data()})));
        setLoading(false);
    });
    const userUnsub = onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const countryUnsub = onSnapshot(doc(db, 'settings', 'countries'), d => setCountryOptions(d.exists() ? d.data().list : []));
    
    return () => { projUnsub(); userUnsub(); countryUnsub(); };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = (name === 'customerName' || name === 'product') ? value.replace(/\s/g, '') : value;
    setCurrentProject(prev => ({ ...prev, [name]: sanitizedValue }));
  };
  
  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentProject({ name: '', crmId: '', amcMso: amcMsoOptions[0], contractDetails: '', customerName: '', countryCode: countryOptions.length > 0 ? countryOptions[0].code : '', product: '', ownerId: '', commonContactEmail: '', commonContactNumber: '' });
    setIsModalOpen(true);
  };
  
  const openEditModal = (project) => {
    setIsEditing(true);
    setCurrentProject(project);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!currentProject.name || !currentProject.ownerId) return alert("Project Name and Owner are required.");
    
    let projectData = { ...currentProject };

    try {
        if (isEditing) {
            const projectRef = doc(db, 'projects', currentProject.id);
            const { id, ...dataToUpdate } = projectData; // Exclude ID from data
            await updateDoc(projectRef, dataToUpdate);
        } else {
            const randomId = Math.floor(100000 + Math.random() * 900000);
            projectData.projectCode = `${projectData.customerName}_${projectData.countryCode}_${projectData.product}_${randomId}`;
            await addDoc(collection(db, 'projects'), { ...projectData, createdBy: auth.currentUser.uid, createdAt: serverTimestamp() });
        }
        setIsModalOpen(false);
        setCurrentProject(null);
    } catch (error) {
      console.error("Error saving project: ", error);
      alert("Error saving project: " + error.message);
    }
  };
  
  const handleDeleteProject = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
        try { await deleteDoc(doc(db, 'projects', id)); } catch (error) { console.error("Error deleting project: ", error); }
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  return (
    <>
      <div className="neumorph-outset" style={{padding: '1.5rem', borderRadius: '12px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
           <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1, minWidth: '250px'}}>
             <input
              type="text"
              placeholder="Search projects by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
           </div>
          <button onClick={openCreateModal} className="btn neumorph-outset" style={{color: 'var(--light-primary)', fontWeight: '600'}}>+ Create Project</button>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
             <thead>
              <tr>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Project Name</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Project Code</th>
                <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Owner</th>
                <th style={{padding: '0.75rem', textAlign: 'right'}} className="text-strong">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4" style={{textAlign: 'center', padding: '1rem'}}>Loading projects...</td></tr>}
              {!loading && paginatedProjects.map(project => (
                <tr key={project.id} className="neumorph-outset" style={{borderRadius: '12px'}}>
                  <td style={{padding: '1rem', fontWeight: '600'}} className="text-strong">{project.name}</td>
                  <td style={{padding: '1rem', fontFamily: 'monospace'}}>{project.projectCode || 'N/A'}</td>
                  <td style={{padding: '1rem'}}>{userMap[project.ownerId] || 'Unassigned'}</td>
                  <td style={{padding: '1rem', textAlign: 'right'}}>
                    <button onClick={() => openEditModal(project)} style={{marginRight: '1rem', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer'}} className="text-primary">Edit</button>
                    <button onClick={() => handleDeleteProject(project.id)} style={{fontWeight: 600, color: '#e53e3e', border: 'none', background: 'transparent', cursor: 'pointer'}}>Delete</button>
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
      
      {isModalOpen && currentProject && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
          <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
            <form onSubmit={handleFormSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                <div className="neumorph-inset"><input type="text" name="name" value={currentProject.name || ''} onChange={handleInputChange} placeholder="Project Name" required className="input-field"/></div>
                <div className="neumorph-inset"><input type="text" name="crmId" value={currentProject.crmId || ''} onChange={handleInputChange} placeholder="CRMID (Optional)" className="input-field"/></div>
                <div className="neumorph-inset"><input type="text" name="customerName" value={currentProject.customerName || ''} onChange={handleInputChange} placeholder="Customer Name (no spaces)" required className="input-field"/></div>
                <div className="neumorph-inset"><input type="text" name="product" value={currentProject.product || ''} onChange={handleInputChange} placeholder="Product (no spaces)" required className="input-field"/></div>
                <div className="neumorph-inset"><select name="countryCode" value={currentProject.countryCode} onChange={handleInputChange} className="input-field">
                    {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select></div>
                <div className="neumorph-inset"><select name="amcMso" value={currentProject.amcMso} onChange={handleInputChange} className="input-field">
                    {amcMsoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select></div>
                <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><select name="ownerId" value={currentProject.ownerId} onChange={handleInputChange} required className="input-field">
                        <option value="">Select an Owner</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
                    </select></div>
                <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><input type="email" name="commonContactEmail" value={currentProject.commonContactEmail || ''} onChange={handleInputChange} placeholder="Common L1 Email (Optional)" className="input-field"/></div>
                <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><input type="text" name="commonContactNumber" value={currentProject.commonContactNumber || ''} onChange={handleInputChange} placeholder="Common L1 Contact Number (Optional)" className="input-field"/></div>
                <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><textarea name="contractDetails" value={currentProject.contractDetails || ''} onChange={handleInputChange} placeholder="Contract Details" required className="input-field" style={{height: '96px'}}></textarea></div>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem'}}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn neumorph-outset">Cancel</button>
                <button type="submit" className="btn neumorph-outset btn-primary">{isEditing ? 'Save Changes' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectManagementPage;
