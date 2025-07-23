import React, { useEffect, useState } from "react";
import "../../neumorphism.css";
import { fetchAdminStats, fetchUserHierarchy, fetchEscalationMatrix, exportReport, listUsers, createUser, updateUser, deleteUser } from "../../api/users";
import { fetchAllProjects, listProjects, createProject, updateProject, deleteProject } from "../../api/projects";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listSettings, saveSetting, deleteSetting } from "../../api/users";

const tileStyle = {
  flex: 1,
  minWidth: 140,
  margin: 12,
  padding: 24,
  borderRadius: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  background: "#f7f8fa",
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "transform 0.1s",
};

const nodeStyle = {
  border: '1px solid #e0e0e0',
  borderRadius: 10,
  padding: '12px 16px',
  margin: '8px 0',
  background: '#fff',
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  cursor: 'pointer',
  minWidth: 180,
};

function TreeNode({ node }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.subordinates && node.subordinates.length > 0;
  return (
    <div style={{ marginLeft: 16, marginTop: 4 }}>
      <div style={nodeStyle} onClick={() => hasChildren && setCollapsed(c => !c)}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{node.name}</div>
        <div style={{ fontSize: 13, color: '#666' }}>{node.email}</div>
        <div style={{ fontSize: 13, color: '#888' }}>{node.role}</div>
        {hasChildren && (
          <span style={{ fontSize: 12, color: '#1a4b7a', marginLeft: 8 }}>
            [{collapsed ? 'Expand' : 'Collapse'}]
          </span>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div style={{ marginLeft: 24, borderLeft: '2px dashed #e0e0e0', paddingLeft: 8 }}>
          {node.subordinates.map(child => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { adminToken } = useAdminAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalProjects: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [hierarchyError, setHierarchyError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [matrix, setMatrix] = useState([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState(null);
  const [exporting, setExporting] = useState({});
  const [exportError, setExportError] = useState({});

  // Add tab state for dashboard
  const [dashboardTab, setDashboardTab] = useState("report");

  useEffect(() => {
    if (!adminToken) return;
    setLoading(true);
    fetchAdminStats(adminToken)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    setHierarchyLoading(true);
    fetchUserHierarchy(adminToken)
      .then(res => setHierarchy(res.hierarchy || []))
      .catch(e => setHierarchyError(e.message))
      .finally(() => setHierarchyLoading(false));
  }, [adminToken]);

  // Fetch all projects for dropdown
  useEffect(() => {
    if (!adminToken) return;
    fetchAllProjects(adminToken)
      .then(res => setProjects(res.projects || []))
      .catch(() => setProjects([]));
  }, [adminToken]);

  // Fetch escalation matrix when project changes
  useEffect(() => {
    if (!adminToken || !selectedProject) return;
    setMatrixLoading(true);
    fetchEscalationMatrix(adminToken, selectedProject)
      .then(res => setMatrix(res.escalationMatrix || []))
      .catch(e => setMatrixError(e.message))
      .finally(() => setMatrixLoading(false));
  }, [adminToken, selectedProject]);

  const handleTileClick = (type) => {
    // For now, just log. Later, navigate or filter.
    console.log(`Clicked: ${type}`);
  };

  const handleExport = async (type, format, projectId = null) => {
    setExportError(e => ({ ...e, [type]: null }));
    setExporting(e => ({ ...e, [type]: true }));
    try {
      const res = await exportReport(adminToken, type, format, projectId);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(er => ({ ...er, [type]: e.message }));
    } finally {
      setExporting(e => ({ ...e, [type]: false }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#f7f8fa', padding: '16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto 32px auto', background: '#f7f8fa', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          <button onClick={() => setDashboardTab('report')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'report' ? '#a3b1c6' : '#e3f0ff', color: dashboardTab === 'report' ? '#fff' : '#1a4b7a', cursor: 'pointer' }}>Report</button>
          <button onClick={() => setDashboardTab('hierarchy')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'hierarchy' ? '#a3b1c6' : '#e3f0ff', color: dashboardTab === 'hierarchy' ? '#fff' : '#1a4b7a', cursor: 'pointer' }}>User Hierarchy</button>
          <button onClick={() => setDashboardTab('escalation')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'escalation' ? '#a3b1c6' : '#e3f0ff', color: dashboardTab === 'escalation' ? '#fff' : '#1a4b7a', cursor: 'pointer' }}>Escalation Matrix</button>
        </div>
        {dashboardTab === 'report' && (
          <>
            {/* Stat Tiles Only */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 800, margin: '0 auto 32px auto' }}>
              <div
                className="neumorphic"
                style={{ ...tileStyle, background: '#e3f0ff', color: '#1a4b7a' }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Total Users</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {loading ? '...' : stats.totalUsers}
                </div>
              </div>
              <div
                className="neumorphic"
                style={{ ...tileStyle, background: '#ffe3e3', color: '#7a1a1a' }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Total Projects</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {loading ? '...' : stats.totalProjects}
                </div>
              </div>
            </div>
          </>
        )}
        {dashboardTab === 'hierarchy' && (
          <>
            <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 12 }}>User Hierarchy</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, justifyContent: 'center' }}>
              <button
                style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleExport('users', 'excel')}
                disabled={exporting.users}
              >
                {exporting.users ? 'Exporting...' : 'Export Users (Excel)'}
              </button>
              <button
                style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleExport('users', 'pdf')}
                disabled={exporting.users}
              >
                {exporting.users ? 'Exporting...' : 'Export Users (PDF)'}
              </button>
              {exportError.users && <div style={{ color: '#b00020', marginBottom: 4 }}>Users: {exportError.users}</div>}
            </div>
            {/* User Hierarchy Tree */}
            {hierarchyLoading ? (
              <div style={{ color: '#888' }}>Loading hierarchy...</div>
            ) : hierarchyError ? (
              <div style={{ color: '#b00020' }}>{hierarchyError}</div>
            ) : hierarchy.length === 0 ? (
              <div style={{ color: '#888' }}>No hierarchy data available.</div>
            ) : (
              <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                {hierarchy.map(root => (
                  <TreeNode key={root.id} node={root} />
                ))}
              </div>
            )}
          </>
        )}
        {dashboardTab === 'escalation' && (
          <>
            <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 12 }}>Escalation Matrix</h3>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="project-select" style={{ fontWeight: 500, fontFamily: "'FK Grotesk', Arial, sans-serif", marginRight: 8 }}>Select Project:</label>
              <select
                id="project-select"
                value={selectedProject}
                onChange={e => { setSelectedProject(e.target.value); setMatrixError(null); }}
                style={{ padding: 6, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}
              >
                <option value="">-- Select --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {matrixLoading ? (
              <div style={{ color: '#888' }}>Loading escalation matrix...</div>
            ) : matrixError ? (
              <div style={{ color: '#b00020' }}>{matrixError}</div>
            ) : !selectedProject ? (
              <div style={{ color: '#888' }}>Please select a project to view the escalation matrix.</div>
            ) : matrix.length === 0 ? (
              <div style={{ color: '#888' }}>No members found for this project.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
                  <thead>
                    <tr style={{ background: '#e3f0ff' }}>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Name</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Email</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Role</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map(member => (
                      <tr key={member.user_id} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 8 }}>{member.name}</td>
                        <td style={{ padding: 8 }}>{member.email}</td>
                        <td style={{ padding: 8 }}>{member.role}</td>
                        <td style={{ padding: 8 }}>{member.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedProject && matrix.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleExport('projects', 'excel')}
                  disabled={exporting.projects}
                >
                  {exporting.projects ? 'Exporting...' : 'Export Projects (Excel)'}
                </button>
                <button
                  style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleExport('projects', 'pdf')}
                  disabled={exporting.projects}
                >
                  {exporting.projects ? 'Exporting...' : 'Export Projects (PDF)'}
                </button>
                {exportError.projects && <div style={{ color: '#b00020', marginLeft: 8 }}>{exportError.projects}</div>}
              </div>
            )}
          </>
        )}
      </div>
      {error && <div style={{ color: '#b00020', textAlign: 'center', marginBottom: 16 }}>{error}</div>}
  </div>
);
};

export default AdminDashboard; 