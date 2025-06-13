import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

// --- Static Data for Dropdowns ---
const amcMsoOptions = ["Not Applicable", "AMC", "MSO"];

// --- Main Project Management Page Component ---
const ProjectManagementPage = () => {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const { currentUser, setIsAppLoading } = useAuth();
    const [countryOptions, setCountryOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const userMap = useMemo(() => users.reduce((acc, user) => ({ ...acc, [user.id]: user.display_name || user.email }), {}), [users]);

    useEffect(() => {
        setIsAppLoading(true);
        const fetchAllData = async () => {
            try {
                const [projectsRes, usersRes, settingsRes] = await Promise.all([
                    supabase.from('projects').select('*'),
                    supabase.from('users').select('id, display_name, email'),
                    supabase.from('settings').select('id, value').eq('id', 'countries')
                ]);

                if (projectsRes.error) throw projectsRes.error;
                if (usersRes.error) throw usersRes.error;
                if (settingsRes.error) throw settingsRes.error;

                setProjects(projectsRes.data || []);
                setUsers(usersRes.data || []);
                if (settingsRes.data.length > 0) {
                    setCountryOptions(settingsRes.data[0].value.list || []);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Could not load project data.");
            } finally {
                setIsAppLoading(false);
            }
        };
        fetchAllData();

        // Note: For real-time updates, you would set up Supabase subscriptions here.
    }, [setIsAppLoading]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const sanitizedValue = (name === 'customer_name' || name === 'product') ? value.replace(/\s/g, '') : value;
        setCurrentProject(prev => ({ ...prev, [name]: sanitizedValue }));
    };
    
    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentProject({ name: '', crm_id: '', amc_mso: amcMsoOptions[0], contract_details: '', customer_name: '', country_code: countryOptions.length > 0 ? countryOptions[0].code : '', product: '', owner_id: '', common_contact_email: '', common_contact_number: '' });
        setIsModalOpen(true);
    };
    
    const openEditModal = (project) => {
        setIsEditing(true);
        setCurrentProject(project);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!currentProject.name || !currentProject.owner_id) return alert("Project Name and Owner are required.");
        
        setIsAppLoading(true);
        
        const projectData = {
            name: currentProject.name,
            crm_id: currentProject.crm_id,
            amc_mso: currentProject.amc_mso,
            contract_details: currentProject.contract_details,
            customer_name: currentProject.customer_name,
            country_code: currentProject.country_code,
            product: currentProject.product,
            owner_id: currentProject.owner_id,
            common_contact_email: currentProject.common_contact_email,
            common_contact_number: currentProject.common_contact_number,
        };

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('projects')
                    .update(projectData)
                    .eq('id', currentProject.id);
                if (error) throw error;
            } else {
                projectData.project_code = `${projectData.customer_name}_${projectData.country_code}_${projectData.product}_${Math.floor(100000 + Math.random() * 900000)}`;
                projectData.created_by = currentUser.uid;
                const { error } = await supabase.from('projects').insert([projectData]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            setCurrentProject(null);
        } catch (error) {
            console.error("Error saving project: ", error);
            alert("Error saving project: " + error.message);
        } finally {
            setIsAppLoading(false);
        }
    };
    
    const handleDeleteProject = async (id) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            setIsAppLoading(true);
            try { 
                const { error } = await supabase.from('projects').delete().eq('id', id);
                if (error) throw error;
            } 
            catch (error) { console.error("Error deleting project: ", error); }
            finally { setIsAppLoading(false); }
        }
    };

    const filteredProjects = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [projects, searchTerm]);
    const paginatedProjects = useMemo(() => filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredProjects, currentPage]);
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

    return (
        <>
          <div className="neumorph-outset" style={{padding: '1.5rem', borderRadius: '12px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
               <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1}}>
                 <input
                  type="text"
                  placeholder="Search projects by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{minWidth: '250px'}}
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
                  {paginatedProjects.map(project => (
                    <tr key={project.id} className="neumorph-outset" style={{borderRadius: '12px'}}>
                      <td style={{padding: '1rem', fontWeight: '600'}} className="text-strong">{project.name}</td>
                      <td style={{padding: '1rem', fontFamily: 'monospace'}}>{project.project_code || 'N/A'}</td>
                      <td style={{padding: '1rem'}}>{userMap[project.owner_id] || 'Unassigned'}</td>
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
          
          {isModalOpen && (
            <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'}}>
              <div className="neumorph-outset" style={{padding: '2rem', width: '100%', maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'}}>
                <button onClick={() => setIsModalOpen(false)} className="btn neumorph-outset" style={{position: 'absolute', top: '1rem', right: '1rem', borderRadius: '50%', padding: '0.5rem', width: '40px', height: '40px'}}>&times;</button>
                <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem'}} className="text-strong">{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
                <form onSubmit={handleFormSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                    <div className="neumorph-inset"><input type="text" name="name" value={currentProject.name || ''} onChange={handleInputChange} placeholder="Project Name" required className="input-field"/></div>
                    <div className="neumorph-inset"><input type="text" name="crm_id" value={currentProject.crm_id || ''} onChange={handleInputChange} placeholder="CRMID (Optional)" className="input-field"/></div>
                    <div className="neumorph-inset"><input type="text" name="customer_name" value={currentProject.customer_name || ''} onChange={handleInputChange} placeholder="Customer Name (no spaces)" required className="input-field"/></div>
                    <div className="neumorph-inset"><input type="text" name="product" value={currentProject.product || ''} onChange={handleInputChange} placeholder="Product (no spaces)" required className="input-field"/></div>
                    <div className="neumorph-inset"><select name="country_code" value={currentProject.country_code} onChange={handleInputChange} className="input-field">
                        {countryOptions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select></div>
                    <div className="neumorph-inset"><select name="amc_mso" value={currentProject.amc_mso} onChange={handleInputChange} className="input-field">
                        {amcMsoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select></div>
                    <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><select name="owner_id" value={currentProject.owner_id} onChange={handleInputChange} required className="input-field">
                            <option value="">Select an Owner</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.email}</option>)}
                        </select></div>
                    <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><input type="email" name="common_contact_email" value={currentProject.common_contact_email || ''} onChange={handleInputChange} placeholder="Common L1 Email (Optional)" className="input-field"/></div>
                    <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><input type="text" name="common_contact_number" value={currentProject.common_contact_number || ''} onChange={handleInputChange} placeholder="Common L1 Contact Number (Optional)" className="input-field"/></div>
                    <div className="neumorph-inset" style={{gridColumn: '1 / -1'}}><textarea name="contract_details" value={currentProject.contract_details || ''} onChange={handleInputChange} placeholder="Contract Details" required className="input-field" style={{height: '96px'}}></textarea></div>
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
