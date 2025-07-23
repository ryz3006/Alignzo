import React, { useEffect, useState } from "react";
import { listProjects, createProject, updateProject, deleteProject } from "../../api/projects";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listUsers } from "../../api/users";
import axios from "axios";

const ProjectManagement = () => {
  const { adminToken } = useAdminAuth();
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [projectLimit] = useState(10);
  const [projectsTable, setProjectsTable] = useState([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", user_id: "", status: "active" });
  const [projectFormError, setProjectFormError] = useState("");
  const [projectDeleteLoading, setProjectDeleteLoading] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [productNames, setProductNames] = useState([]);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    if (!adminToken) return;
    setProjectsLoading(true);
    listProjects(adminToken, { search: projectSearch, page: projectPage, limit: projectLimit })
      .then(res => { setProjectsTable(res.projects); setProjectsTotal(res.total); setProjectsError(null); })
      .catch(e => setProjectsError(e.message))
      .finally(() => setProjectsLoading(false));
  }, [adminToken, projectSearch, projectPage, projectLimit]);

  // Fetch users, product names, and countries when modal opens
  useEffect(() => {
    if (showProjectModal && adminToken) {
      listUsers(adminToken, { page: 1, limit: 1000 })
        .then(res => setAllUsers(res.users))
        .catch(() => setAllUsers([]));
      axios.get("/adminDashboard/settings/product-names", { headers: { Authorization: `Bearer ${adminToken}` } })
        .then(res => setProductNames(res.data.product_names || []))
        .catch(() => setProductNames([]));
      axios.get("/adminDashboard/settings/countries", { headers: { Authorization: `Bearer ${adminToken}` } })
        .then(res => setCountries(res.data.countries || []))
        .catch(() => setCountries([]));
    }
  }, [showProjectModal, adminToken]);

  const openCreateProject = () => { setEditingProject(null); setProjectForm({ name: "", description: "", user_id: "", status: "active" }); setProjectFormError(""); setShowProjectModal(true); };
  const openEditProject = (project) => { setEditingProject(project); setProjectForm({ ...project }); setProjectFormError(""); setShowProjectModal(true); };
  const closeProjectModal = () => { setShowProjectModal(false); setEditingProject(null); setProjectFormError(""); };

  const handleProjectFormSubmit = async (e) => {
    e.preventDefault();
    setProjectFormError("");
    try {
      if (editingProject) {
        await updateProject(adminToken, editingProject.id, projectForm);
      } else {
        await createProject(adminToken, projectForm);
      }
      closeProjectModal();
      setProjectPage(1);
      setProjectSearch("");
    } catch (err) {
      setProjectFormError(err.message);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    setProjectDeleteLoading(id);
    try {
      await deleteProject(adminToken, id);
      setProjectPage(1);
      setProjectSearch("");
    } catch (err) {
      alert(err.message);
    } finally {
      setProjectDeleteLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto 32px auto', background: '#f7f8fa', borderRadius: 16, padding: 16 }}>
      <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Project Management</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search projects..."
          value={projectSearch}
          onChange={e => { setProjectSearch(e.target.value); setProjectPage(1); }}
          style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", flex: 1, minWidth: 120 }}
        />
        <button
          style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#ffe3e3', color: '#7a1a1a', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          onClick={openCreateProject}
        >+ Add Project</button>
      </div>
      {projectsLoading ? (
        <div style={{ color: '#888' }}>Loading projects...</div>
      ) : projectsError ? (
        <div style={{ color: '#b00020' }}>{projectsError}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
            <thead>
              <tr style={{ background: '#ffe3e3' }}>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Name</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Description</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Owner (User ID)</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}></th>
              </tr>
            </thead>
            <tbody>
              {projectsTable.map(project => (
                <tr key={project.id} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{project.name}</td>
                  <td style={{ padding: 8 }}>{project.description}</td>
                  <td style={{ padding: 8 }}>{project.status}</td>
                  <td style={{ padding: 8 }}>{project.user_id}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button style={{ padding: '4px 10px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#ffe3e3', color: '#7a1a1a', border: 'none', cursor: 'pointer' }} onClick={() => openEditProject(project)}>Edit</button>
                    <button style={{ padding: '4px 10px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#e3f0ff', color: '#1a4b7a', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteProject(project.id)} disabled={projectDeleteLoading === project.id}>{projectDeleteLoading === project.id ? 'Deleting...' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={() => setProjectPage(p => Math.max(1, p - 1))} disabled={projectPage === 1} style={{ padding: '6px 12px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#ffe3e3', color: '#7a1a1a', fontWeight: 600, cursor: projectPage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
        <span style={{ fontFamily: "'FK Grotesk', Arial, sans-serif" }}>Page {projectPage} of {Math.ceil(projectsTotal / projectLimit) || 1}</span>
        <button onClick={() => setProjectPage(p => p + 1)} disabled={projectPage * projectLimit >= projectsTotal} style={{ padding: '6px 12px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#ffe3e3', color: '#7a1a1a', fontWeight: 600, cursor: projectPage * projectLimit >= projectsTotal ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
      {/* Project Modal */}
      {showProjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleProjectFormSubmit} style={{ background: '#fff', borderRadius: 14, padding: 28, minWidth: 320, maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.13)', fontFamily: "'FK Grotesk', Arial, sans-serif", display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ margin: 0, fontWeight: 700 }}>{editingProject ? 'Edit Project' : 'Add Project'}</h4>
            <input type="text" placeholder="Name" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />
            <input type="text" placeholder="Description" value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />
            {/* Owner dropdown */}
            <label style={{ fontWeight: 500 }}>Owner</label>
            <select value={projectForm.user_id} onChange={e => setProjectForm(f => ({ ...f, user_id: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
              <option value="">-- Select Owner --</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            {/* Product name dropdown */}
            <label style={{ fontWeight: 500 }}>Product Name</label>
            <select value={projectForm.product_name || ""} onChange={e => setProjectForm(f => ({ ...f, product_name: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
              <option value="">-- Select Product --</option>
              {productNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* Country dropdown */}
            <label style={{ fontWeight: 500 }}>Country</label>
            <select value={projectForm.country || ""} onChange={e => setProjectForm(f => ({ ...f, country: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
              <option value="">-- Select Country --</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={projectForm.status} onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))} style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            {projectFormError && <div style={{ color: '#b00020' }}>{projectFormError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#ffe3e3', color: '#7a1a1a', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editingProject ? 'Update' : 'Create'}</button>
              <button type="button" onClick={closeProjectModal} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#eee', color: '#444', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement; 