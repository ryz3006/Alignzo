import React, { useEffect, useState } from "react";
import { listProjects, createProject, updateProject, deleteProject } from "../../api/projects";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listUsers } from "../../api/users";
import axios from "axios";
import { MdEdit, MdDelete } from "react-icons/md";
import { useSettings } from "../../contexts/SettingsContext";

const ProjectManagement = () => {
  const { adminToken } = useAdminAuth();
  const { productNames, countries, fetchSettings } = useSettings();
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const [projectLimit, setProjectLimit] = useState(10);
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
  // Remove local productNames/countries state and fetching logic
  const [ribbonMessage, setRibbonMessage] = useState("");
  const [ribbonType, setRibbonType] = useState("success");

  // Add filter state for all columns
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterOwnerEmail, setFilterOwnerEmail] = useState("");

  // Update filter handlers
  const handleStatusChange = e => { setFilterStatus(e.target.value); setProjectPage(1); };
  const handleCountryChange = e => { setFilterCountry(e.target.value); setProjectPage(1); };
  const handleProductChange = e => { setFilterProduct(e.target.value); setProjectPage(1); };
  const handleOwnerEmailChange = e => { setFilterOwnerEmail(e.target.value); setProjectPage(1); };

  // Fetch projects from backend when main search or page changes
  useEffect(() => {
    if (!adminToken) return;
    setProjectsLoading(true);
    listProjects(adminToken, { search: projectSearch, page: projectPage, limit: projectLimit })
      .then(res => { setProjectsTable(res.projects); setProjectsTotal(res.total); setProjectsError(null); })
      .catch(e => setProjectsError(e.message))
      .finally(() => setProjectsLoading(false));
  }, [adminToken, projectSearch, projectPage, projectLimit]);

  // Filter projects client-side for dropdown/text filters
  const filteredProjects = projectsTable.filter(project => {
    if (filterStatus && project.status !== filterStatus) return false;
    if (filterCountry && project.country !== filterCountry) return false;
    if (filterProduct && project.product_name !== filterProduct) return false;
    if (filterOwnerEmail && (!project.owner_email || !project.owner_email.toLowerCase().includes(filterOwnerEmail.toLowerCase()))) return false;
    return true;
  });

  // Fetch users, product names, and countries when modal opens
  useEffect(() => {
    if (showProjectModal && adminToken) {
      listUsers(adminToken, { page: 1, limit: 1000 })
        .then(res => setAllUsers(res.users))
        .catch(() => setAllUsers([]));
      // axios.get("/adminDashboard/settings/product-names", { headers: { Authorization: `Bearer ${adminToken}` } })
      //   .then(res => setProductNames(res.data.product_names || []))
      //   .catch(() => setProductNames([]));
      // axios.get("/adminDashboard/settings/countries", { headers: { Authorization: `Bearer ${adminToken}` } })
      //   .then(res => setCountries(res.data.countries || []))
      //   .catch(() => setCountries([]));
    }
  }, [showProjectModal, adminToken]);

  // Fetch settings (productNames, countries) on mount or when adminToken changes
  React.useEffect(() => {
    if (adminToken) {
      fetchSettings();
    }
  }, [adminToken, fetchSettings]);

  // Helper to refresh project list
  const refreshProjects = () => {
    if (!adminToken) return;
    setProjectsLoading(true);
    listProjects(adminToken, { search: projectSearch, page: projectPage, limit: projectLimit })
      .then(res => { setProjectsTable(res.projects); setProjectsTotal(res.total); setProjectsError(null); })
      .catch(e => setProjectsError(e.message))
      .finally(() => setProjectsLoading(false));
  };

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
      refreshProjects(); // Refresh the list after add/edit
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
      setRibbonType("success");
      setRibbonMessage("Project deleted successfully.");
      refreshProjects(); // Refresh the list after deletion
    } catch (err) {
      setRibbonType("error");
      setRibbonMessage(err.message || "Failed to delete project.");
      alert(err.message);
    } finally {
      setProjectDeleteLoading(null);
      setTimeout(() => setRibbonMessage(""), 2500);
    }
  };

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto 32px auto',
        background: 'var(--primary-bg)',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px var(--primary-shadow)',
      }}
    >
      <h3
        style={{
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          fontWeight: 700,
          fontSize: 22,
          marginBottom: 12,
          color: 'var(--primary-color)',
        }}
      >
        Project Management
      </h3>
      {ribbonMessage && (
        <div style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          background: ribbonType === 'success' ? '#43a047' : '#b00020',
          color: '#fff',
          padding: '12px 32px',
          borderRadius: 10,
          fontWeight: 600,
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          fontSize: 16,
          zIndex: 2001,
          boxShadow: '0 4px 18px #0003',
          letterSpacing: 1,
          minWidth: 220,
          textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
        }}>
          {ribbonMessage}
        </div>
      )}
      {/* Filter UI: Search input on one row, dropdowns on next row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input
            type="text"
            placeholder="Search project name, description, product, country, or owner email..."
            value={projectSearch}
            onChange={e => { setProjectSearch(e.target.value); setProjectPage(1); }}
            style={{
              padding: 8,
              borderRadius: 6,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              flex: 1,
              minWidth: 120,
              background: 'var(--primary-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-shadow)',
            }}
          />
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              background: 'var(--primary-highlight)',
              color: 'var(--primary-color)',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
            }}
            onClick={openCreateProject}
          >
            + Add Project
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select
            value={filterStatus}
            onChange={handleStatusChange}
            style={{
              padding: 8,
              borderRadius: 6,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              minWidth: 120,
              background: 'var(--primary-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-shadow)',
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-hold">On-Hold/Paused</option>
          </select>
          <select
            value={filterCountry}
            onChange={handleCountryChange}
            style={{
              padding: 8,
              borderRadius: 6,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              minWidth: 120,
              background: 'var(--primary-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-shadow)',
            }}
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterProduct}
            onChange={handleProductChange}
            style={{
              padding: 8,
              borderRadius: 6,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              minWidth: 120,
              background: 'var(--primary-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-shadow)',
            }}
          >
            <option value="">All Products</option>
            {productNames.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      {projectsLoading ? (
        <div style={{ color: 'var(--primary-color, #888)' }}>Loading projects...</div>
      ) : projectsError ? (
        <div style={{ color: '#b00020' }}>{projectsError}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              background: 'var(--primary-bg)',
              color: 'var(--primary-color)',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--primary-highlight)' }}>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Project Name</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Country</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Product Name</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Owner Email</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <tr
                  key={project.id}
                  style={{
                    background: 'var(--primary-bg)',
                    borderBottom: '1px solid var(--primary-shadow)',
                    color: 'var(--primary-color)',
                  }}
                >
                  <td style={{ padding: 8 }}>{project.name}</td>
                  <td style={{ padding: 8 }}>{project.status}</td>
                  <td style={{ padding: 8 }}>{project.country || '-'}</td>
                  <td style={{ padding: 8 }}>{project.product_name || '-'}</td>
                  <td style={{ padding: 8 }}>{project.owner_email || '-'}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                      }}
                      onClick={() => openEditProject(project)}
                      title="Edit"
                    >
                      <MdEdit />
                    </button>
                    <button
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        background: 'var(--primary-highlight)',
                        color: '#b00020',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
                      }}
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={projectDeleteLoading === project.id}
                      title="Delete"
                    >
                      {projectDeleteLoading === project.id ? <span style={{ fontSize: 13 }}>...</span> : <MdDelete />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor="perPage" style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)', fontSize: 14 }}>Per Page:</label>
          <select
            id="perPage"
            value={projectLimit}
            onChange={e => { setProjectLimit(Number(e.target.value)); setProjectPage(1); }}
            style={{ padding: 6, borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: '1px solid var(--primary-shadow)', background: 'var(--primary-bg)', color: 'var(--primary-color)' }}
          >
            {[5, 10, 25, 50, 100].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setProjectPage(p => Math.max(1, p - 1))}
            disabled={projectPage === 1}
            style={{
              padding: '6px 12px',
              borderRadius: 5,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: projectPage === 1 ? 'not-allowed' : 'pointer',
              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
            }}
          >
            Prev
          </button>
          <span style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)' }}>
            Page {projectPage} of {Math.ceil(projectsTotal / projectLimit) || 1}
          </span>
          <button
            onClick={() => setProjectPage(p => p + 1)}
            disabled={projectPage * projectLimit >= projectsTotal}
            style={{
              padding: '6px 12px',
              borderRadius: 5,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: projectPage * projectLimit >= projectsTotal ? 'not-allowed' : 'pointer',
              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
            }}
          >
            Next
          </button>
        </div>
      </div>
      {/* Project Modal */}
      {showProjectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
            marginBottom: 32,
          }}
        >
          <form
            onSubmit={handleProjectFormSubmit}
            style={{
              background: 'var(--primary-bg)',
              borderRadius: 14,
              padding: 28,
              minWidth: 320,
              maxWidth: '90vw',
              boxShadow: '0 4px 24px var(--primary-shadow)',
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              color: 'var(--primary-color)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-color)' }}>
              {editingProject ? 'Edit Project' : 'Add Project'}
            </h4>
            <input
              type="text"
              placeholder="Name"
              value={projectForm.name}
              onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            />
            <input
              type="text"
              placeholder="Description"
              value={projectForm.description}
              onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            />
            {/* Owner dropdown */}
            <label style={{ fontWeight: 500, color: 'var(--primary-color)' }}>Owner</label>
            <select
              value={projectForm.user_id}
              onChange={e => setProjectForm(f => ({ ...f, user_id: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            >
              <option value="">-- Select Owner --</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            {/* Product name dropdown */}
            <label style={{ fontWeight: 500, color: 'var(--primary-color)' }}>Product Name</label>
            <select
              value={projectForm.product_name || ""}
              onChange={e => setProjectForm(f => ({ ...f, product_name: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            >
              <option value="">-- Select Product --</option>
              {productNames.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            {/* Country dropdown */}
            <label style={{ fontWeight: 500, color: 'var(--primary-color)' }}>Country</label>
            <select
              value={projectForm.country || ""}
              onChange={e => setProjectForm(f => ({ ...f, country: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            >
              <option value="">-- Select Country --</option>
              {countries.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={projectForm.status}
              onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on-hold">On-Hold/Paused</option>
            </select>
            {projectFormError && <div style={{ color: '#b00020' }}>{projectFormError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--accent)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}
              >
                {editingProject ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeProjectModal}
                style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-highlight)', color: 'var(--primary-color)', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement; 