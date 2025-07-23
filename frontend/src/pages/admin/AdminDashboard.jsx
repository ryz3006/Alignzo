import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../neumorphism.css";
import { fetchAdminStats, fetchUserHierarchy, fetchEscalationMatrix, exportReport, listUsers, createUser, updateUser, deleteUser } from "../../api/users";
import { fetchAllProjects, listProjects, createProject, updateProject, deleteProject } from "../../api/projects";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listSettings, saveSetting, deleteSetting } from "../../api/users";
import { MdFileDownload, MdPictureAsPdf, MdImage } from 'react-icons/md';
import { toPng } from 'html-to-image';
import { useLoading } from "../../contexts/LoadingContext";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useEffect as useEffectReact, useState as useStateReact } from 'react';

// Place THEME_COLORS at the top level
const THEME_COLORS_LIGHT = [
  '#1976d2', '#b00020', '#ffa000', '#43a047', '#8e24aa', '#00bcd4', '#ff4081', '#ffd600', '#00c853', '#ff6d00', '#0097a7', '#c51162', '#d50000', '#aa00ff', '#304ffe', '#00e676', '#ffab00', '#ff1744', '#00bfae', '#f50057'
];
const THEME_COLORS_DARK = [
  '#43a047', '#1976d2', '#ffa000', '#8e24aa', '#b00020', '#00bcd4', '#ff4081', '#ffd600', '#00c853', '#ff6d00', '#0097a7', '#c51162', '#d50000', '#aa00ff', '#304ffe', '#00e676', '#ffab00', '#ff1744', '#00bfae', '#f50057'
];
const getThemeColors = () => isDarkMode() ? THEME_COLORS_DARK : THEME_COLORS_LIGHT;

const tileStyle = {
  flex: 1,
  minWidth: 140,
  margin: 12,
  padding: 24,
  borderRadius: 16,
  boxShadow: "0 2px 8px var(--primary-shadow)",
  background: "var(--primary-highlight)",
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "transform 0.1s",
  color: 'var(--primary-color)',
};

// Custom recursive tree rendering
const cardStyle = {
  border: '1px solid var(--primary-shadow)',
  borderRadius: 12,
  padding: '14px 20px',
  background: 'var(--primary-bg)',
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  color: 'var(--primary-color)',
  boxShadow: '0 2px 8px var(--primary-shadow)',
  minWidth: 180,
  textAlign: 'center',
  margin: '0 auto',
  marginBottom: 8,
  position: 'relative',
  zIndex: 2,
};

// Expand/collapse icon (plus/minus)
const ExpandCollapseIcon = ({ collapsed }) => (
  <span style={{
    display: 'inline-block',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    color: 'var(--accent)',
    fontWeight: 900,
    fontSize: 14,
    marginLeft: 4,
    boxShadow: '0 1px 4px #0001',
    lineHeight: '16px',
    textAlign: 'center',
    border: '1.5px solid var(--accent)',
    userSelect: 'none',
  }}>
    {collapsed ? '+' : '−'}
  </span>
);

// Helper: recursively count users in a subtree
function countSubtreeUsers(user) {
  if (!user.subordinates || user.subordinates.length === 0) return 1;
  return 1 + user.subordinates.reduce((sum, child) => sum + countSubtreeUsers(child), 0);
}

// Custom recursive tree rendering with expand/collapse
function UserNode({ user, collapsed, onToggle }) {
  const hasChildren = user.subordinates && user.subordinates.length > 0;
  const count = countSubtreeUsers(user);
  return (
    <div style={{ ...cardStyle, position: 'relative', paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</span>
      </div>
      <div style={{ fontSize: 13, color: '#666', margin: '2px 0' }}>{user.email}</div>
      <div style={{ fontSize: 13, color: '#888' }}>{user.designation || '-'}</div>
      {/* Bubble with count and expand/collapse icon at bottom center */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -18,
          transform: 'translateX(-50%)',
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: '50%',
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
          boxShadow: '0 2px 8px #0002',
          zIndex: 10,
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'background 0.18s',
        }}
        onClick={hasChildren ? onToggle : undefined}
        title={hasChildren ? (collapsed ? 'Expand branch' : 'Collapse branch') : 'Total users in this branch'}
      >
        {count}
        {hasChildren && (
          <ExpandCollapseIcon collapsed={collapsed} />
        )}
      </div>
    </div>
  );
}

// CSS-based tree branch rendering with flex and lines
function TreeBranch({ user, collapsedMap, setCollapsedMap }) {
  const hasChildren = user.subordinates && user.subordinates.length > 0;
  const isCollapsed = !!collapsedMap[user.id];
  const handleToggle = () => setCollapsedMap(m => ({ ...m, [user.id]: !isCollapsed }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180, position: 'relative' }}>
      <UserNode user={user} collapsed={isCollapsed} onToggle={hasChildren ? handleToggle : undefined} />
      {hasChildren && !isCollapsed && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          {/* Vertical line from parent to horizontal connector */}
          <div style={{ height: 18, width: 2, background: 'var(--primary-shadow)', margin: '0 auto', position: 'relative', zIndex: 1 }} />
          {/* Horizontal connector line */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
            <div style={{
              height: 2,
              background: 'var(--primary-shadow)',
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              zIndex: 1,
              width: '100%',
            }} />
            {/* Children nodes */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', position: 'relative', marginTop: 0 }}>
              {user.subordinates.map((child, idx) => (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180, margin: '0 24px', position: 'relative' }}>
                  {/* Vertical line from horizontal connector to child */}
                  <div style={{ height: 18, width: 2, background: 'var(--primary-shadow)', position: 'relative', zIndex: 1 }} />
                  <TreeBranch user={child} collapsedMap={collapsedMap} setCollapsedMap={setCollapsedMap} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomHierarchyTree({ roots }) {
  const [collapsedMap, setCollapsedMap] = useStateReact({});
  useEffectReact(() => { setCollapsedMap({}); }, [roots]); // Reset collapse on data change
  if (!roots || roots.length === 0) return null;
  return (
    <div style={{ width: '100%', minHeight: 500, height: '60vh', maxHeight: 700, overflow: 'auto', overflowX: 'auto', background: 'var(--primary-bg)', borderRadius: 12, boxShadow: '0 2px 8px var(--primary-shadow)', padding: 8, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'row', minWidth: roots.length * 320, justifyContent: 'center', alignItems: 'flex-start' }}>
        {roots.map(root => (
          <div key={root.id} style={{ margin: '0 32px' }}>
            <TreeBranch user={root} collapsedMap={collapsedMap} setCollapsedMap={setCollapsedMap} />
          </div>
        ))}
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const { adminToken } = useAdminAuth();
  const { setLoading } = useLoading();
  const [stats, setStats] = useStateReact({ totalUsers: 0, totalProjects: 0 });
  const [statsLoading, setStatsLoading] = useStateReact(true); // was 'loading'
  const [error, setError] = useStateReact(null);
  const [hierarchy, setHierarchy] = useStateReact([]);
  const [hierarchyLoading, setHierarchyLoading] = useStateReact(true);
  const [hierarchyError, setHierarchyError] = useStateReact(null);
  const [projects, setProjects] = useStateReact([]);
  const [selectedProject, setSelectedProject] = useStateReact("");
  const [matrix, setMatrix] = useStateReact([]);
  const [matrixLoading, setMatrixLoading] = useStateReact(false);
  const [matrixError, setMatrixError] = useStateReact(null);
  const [exporting, setExporting] = useStateReact({});
  const [exportError, setExportError] = useStateReact({});

  // Add tab state for dashboard
  const [dashboardTab, setDashboardTab] = useStateReact("report");

  const treeContainerRef = useRef(null);
  const [translate, setTranslate] = useStateReact({ x: 0, y: 0 });

  // Center tree on mount
  useEffectReact(() => {
    if (treeContainerRef.current) {
      const { width, height } = treeContainerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 60 });
    }
  }, [hierarchy]);

  useEffectReact(() => {
    if (!adminToken) return;
    setStatsLoading(true);
    fetchAdminStats(adminToken)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setStatsLoading(false));
  }, [adminToken]);

  useEffectReact(() => {
    if (!adminToken) return;
    setHierarchyLoading(true);
    fetchUserHierarchy(adminToken)
      .then(res => setHierarchy(res.hierarchy || []))
      .catch(e => setHierarchyError(e.message))
      .finally(() => setHierarchyLoading(false));
  }, [adminToken]);

  // Fetch all projects for dropdown
  useEffectReact(() => {
    if (!adminToken) return;
    fetchAllProjects(adminToken)
      .then(res => setProjects(res.projects || []))
      .catch(() => setProjects([]));
  }, [adminToken]);

  // Fetch escalation matrix when project changes
  useEffectReact(() => {
    if (!adminToken || !selectedProject) return;
    setMatrixLoading(true);
    fetchEscalationMatrix(adminToken, selectedProject)
      .then(res => setMatrix(res.escalationMatrix || []))
      .catch(e => setMatrixError(e.message))
      .finally(() => setMatrixLoading(false));
  }, [adminToken, selectedProject]);

  // Chart data state
  const [projectsByProduct, setProjectsByProduct] = useStateReact([]);
  const [projectsByCountry, setProjectsByCountry] = useStateReact([]);
  const [usersByDesignation, setUsersByDesignation] = useStateReact([]);
  const [projectsByStatus, setProjectsByStatus] = useStateReact([]);
  // Fetch chart data
  useEffectReact(() => {
    if (!adminToken) return;
    fetch("/api/admin/dashboard/charts/projects-by-product", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => res.json())
      .then(data => setProjectsByProduct(Array.isArray(data) ? data.map(item => ({ ...item, value: Number(item.value) })) : []))
      .catch(() => setProjectsByProduct([]));
    fetch("/api/admin/dashboard/charts/projects-by-country", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => res.json())
      .then(data => setProjectsByCountry(Array.isArray(data) ? data.map(item => ({ ...item, value: Number(item.value) })) : []))
      .catch(() => setProjectsByCountry([]));
    fetch("/api/admin/dashboard/charts/users-by-designation", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => res.json())
      .then(data => setUsersByDesignation(Array.isArray(data) ? data.map(item => ({ ...item, value: Number(item.value) })) : []))
      .catch(() => setUsersByDesignation([]));
    fetch("/api/admin/dashboard/charts/projects-by-status", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(res => res.json())
      .then(data => setProjectsByStatus(Array.isArray(data) ? data.map(item => ({ ...item, value: Number(item.value) })) : []))
      .catch(() => setProjectsByStatus([]));
  }, [adminToken]);

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

  // Ribbon notification state for Escalation Matrix
  const [matrixRibbon, setMatrixRibbon] = useStateReact("");
  const [matrixRibbonType, setMatrixRibbonType] = useStateReact("error");

  // Add a handler for tab switching with loading overlay
  const handleTabSwitch = (tab) => {
    setLoading(true);
    setDashboardTab(tab);
    setTimeout(() => setLoading(false), 300); // Ensure at least 0.3s
  };

  // Add hover state to each chart card
  const [hoveredTile, setHoveredTile] = useStateReact(null);

  // Add a custom legend renderer for PieCharts
  const renderPieLegend = (data, colors) => (props) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 18 }}>
        {payload.map((entry, idx) => {
          // Find the correct label from the data array
          const dataItem = data.find(d => d.label === entry.payload.label);
          return (
            <span key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 500, fontSize: 16, color: isDarkMode() ? '#f1f1f1' : '#444' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: colors[idx % colors.length], display: 'inline-block', border: '1.5px solid #bbb', marginRight: 4 }}></span>
              {dataItem ? dataItem.label : entry.value}
            </span>
          );
        })}
      </div>
    );
  };

  // Add a custom tooltip for PieCharts
  const renderPieTooltip = (props) => {
    if (!props.active || !props.payload || !props.payload.length) return null;
    const { label, value } = props.payload[0].payload;
    // Calculate percentage if possible
    const total = props.payload[0].payload && props.payload[0].payload._pieTotal ? props.payload[0].payload._pieTotal : null;
    let percent = null;
    if (total && value) {
      percent = ((value / total) * 100).toFixed(1);
    }
    return (
      <div style={{ background: isDarkMode() ? '#23272f' : '#fff', color: isDarkMode() ? '#f1f1f1' : '#222', border: isDarkMode() ? '1px solid #444' : '1.5px solid #bbb', borderRadius: 10, fontFamily: "'FK Grotesk', Arial, sans-serif", fontSize: 15, boxShadow: isDarkMode() ? '0 2px 8px #0003' : '0 2px 12px #bbb3', padding: '10px 16px', minWidth: 120 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 500 }}>Count: {value}</div>
        {percent !== null && <div style={{ fontWeight: 400, color: isDarkMode() ? '#aaa' : '#666' }}>({percent}%)</div>}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', padding: '16px', color: 'var(--primary-color)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto 32px auto', background: 'var(--primary-bg)', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px var(--primary-shadow)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          <button onClick={() => handleTabSwitch('report')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'report' ? 'var(--accent)' : 'var(--primary-highlight)', color: dashboardTab === 'report' ? '#fff' : 'var(--primary-color)', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}>Report</button>
          <button onClick={() => handleTabSwitch('hierarchy')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'hierarchy' ? 'var(--accent)' : 'var(--primary-highlight)', color: dashboardTab === 'hierarchy' ? '#fff' : 'var(--primary-color)', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}>User Hierarchy</button>
          <button onClick={() => handleTabSwitch('escalation')} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 600, border: 'none', background: dashboardTab === 'escalation' ? 'var(--accent)' : 'var(--primary-highlight)', color: dashboardTab === 'escalation' ? '#fff' : 'var(--primary-color)', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}>Escalation Matrix</button>
        </div>
        {dashboardTab === 'report' && (
          <>
            {/* Stat Tiles Only */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 800, margin: '0 auto 32px auto' }}>
              <div
                className="neumorphic"
                style={{ ...tileStyle, background: 'var(--primary-highlight)', color: 'var(--primary-color)' }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Total Users</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {statsLoading ? '...' : stats.totalUsers}
                </div>
              </div>
              <div
                className="neumorphic"
                style={{ ...tileStyle, background: 'var(--primary-highlight)', color: 'var(--primary-color)' }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Total Projects</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {statsLoading ? '...' : stats.totalProjects}
                </div>
              </div>
            </div>
            {/* Charts Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 32,
              margin: '0 auto',
              maxWidth: 1100,
              padding: '12px 0',
            }}>
              {/* Projects by Product Pie/Donut */}
              <div
                style={{
                  ...getChartCardStyle(),
                  ...(hoveredTile === 'product' ? getChartCardHoverStyle() : {}),
                }}
                onMouseEnter={() => setHoveredTile('product')}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <h4 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--primary-color)', marginBottom: 8 }}>Projects by Product</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={projectsByProduct}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                    >
                      {projectsByProduct.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={getThemeColors()[idx % getThemeColors().length]} stroke={isDarkMode() ? '#23272f' : '#fff'} strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={renderPieTooltip} wrapperStyle={getTooltipStyle()} contentStyle={getTooltipStyle()} labelStyle={getLegendStyle()} itemStyle={getLegendStyle()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Projects by Status Pie/Donut */}
              <div
                style={{
                  ...getChartCardStyle(),
                  ...(hoveredTile === 'status' ? getChartCardHoverStyle() : {}),
                }}
                onMouseEnter={() => setHoveredTile('status')}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <h4 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--primary-color)', marginBottom: 8 }}>Projects by Status</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={projectsByStatus}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                    >
                      {projectsByStatus.map((entry, idx) => (
                        <Cell key={`cell-status-${idx}`} fill={getThemeColors()[(idx+3) % getThemeColors().length]} stroke={isDarkMode() ? '#23272f' : '#fff'} strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={renderPieTooltip} wrapperStyle={getTooltipStyle()} contentStyle={getTooltipStyle()} labelStyle={getLegendStyle()} itemStyle={getLegendStyle()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Projects by Country Pie */}
              <div
                style={{
                  ...getChartCardStyle(),
                  ...(hoveredTile === 'country' ? getChartCardHoverStyle() : {}),
                }}
                onMouseEnter={() => setHoveredTile('country')}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <h4 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--primary-color)', marginBottom: 8 }}>Projects by Country</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={projectsByCountry}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                    >
                      {projectsByCountry.map((entry, idx) => (
                        <Cell key={`cell-country-${idx}`} fill={getThemeColors()[idx % getThemeColors().length]} stroke={isDarkMode() ? '#23272f' : '#fff'} strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={renderPieTooltip} wrapperStyle={getTooltipStyle()} contentStyle={getTooltipStyle()} labelStyle={getLegendStyle()} itemStyle={getLegendStyle()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Users by Designation Pie */}
              <div
                style={{
                  ...getChartCardStyle(),
                  ...(hoveredTile === 'designation' ? getChartCardHoverStyle() : {}),
                }}
                onMouseEnter={() => setHoveredTile('designation')}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <h4 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--primary-color)', marginBottom: 8 }}>Users by Designation</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={usersByDesignation}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                    >
                      {usersByDesignation.map((entry, idx) => (
                        <Cell key={`cell-designation-${idx}`} fill={getThemeColors()[idx % getThemeColors().length]} stroke={isDarkMode() ? '#23272f' : '#fff'} strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={renderPieTooltip} wrapperStyle={getTooltipStyle()} contentStyle={getTooltipStyle()} labelStyle={getLegendStyle()} itemStyle={getLegendStyle()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
        {dashboardTab === 'hierarchy' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--primary-color)', margin: 0 }}>User Hierarchy</h3>
              <div style={{ display: 'flex', gap: 28 }}>
                <button
                  onClick={() => handleExport('users-detailed', 'excel')}
                  title="Download Excel"
                  style={{
                    background: 'var(--primary-highlight)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px #0002',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 32,
                    transition: 'background 0.18s, transform 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.13)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <MdFileDownload />
                </button>
                <button
                  onClick={() => handleExport('users-detailed', 'pdf')}
                  title="Download PDF"
                  style={{
                    background: 'var(--primary-highlight)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px #0002',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 32,
                    transition: 'background 0.18s, transform 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.13)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <MdPictureAsPdf />
                </button>
              </div>
            </div>
            {/* Collapsed state for expand/collapse */}
            <HierarchyWithDownload
              hierarchy={hierarchy}
              handleExport={handleExport}
            />
          </>
        )}
        {dashboardTab === 'escalation' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--primary-color)', margin: 0 }}>Escalation Matrix</h3>
              <div style={{ display: 'flex', gap: 28 }}>
                <button
                  onClick={() => {
                    if (!selectedProject) {
                      setMatrixRibbonType('error');
                      setMatrixRibbon('Please select a project to download.');
                      setTimeout(() => setMatrixRibbon(""), 2500);
                      return;
                    }
                    handleExport('escalation-matrix', 'excel', selectedProject);
                  }}
                  title="Download Excel"
                  style={{
                    background: 'var(--primary-highlight)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px #0002',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 32,
                    transition: 'background 0.18s, transform 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.13)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <MdFileDownload />
                </button>
                <button
                  onClick={() => {
                    if (!selectedProject) {
                      setMatrixRibbonType('error');
                      setMatrixRibbon('Please select a project to download.');
                      setTimeout(() => setMatrixRibbon(""), 2500);
                      return;
                    }
                    handleExport('escalation-matrix', 'pdf', selectedProject);
                  }}
                  title="Download PDF"
                  style={{
                    background: 'var(--primary-highlight)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px #0002',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    fontSize: 32,
                    transition: 'background 0.18s, transform 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.13)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <MdPictureAsPdf />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="project-select" style={{ fontWeight: 500, fontFamily: "'FK Grotesk', Arial, sans-serif", marginRight: 8, color: 'var(--primary-color)' }}>Select Project:</label>
              <select
                id="project-select"
                value={selectedProject}
                onChange={e => { setSelectedProject(e.target.value); setMatrixError(null); }}
                style={{ padding: 6, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
              >
                <option value="">-- Select --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {matrixLoading ? (
              <div style={{ color: 'var(--primary-color, #888)' }}>Loading escalation matrix...</div>
            ) : matrixError ? (
              <div style={{ color: '#b00020' }}>{matrixError}</div>
            ) : !selectedProject ? (
              <div style={{ color: 'var(--primary-color, #888)' }}>Please select a project to view the escalation matrix.</div>
            ) : matrix.length === 0 ? (
              <div style={{ color: 'var(--primary-color, #888)' }}>No members found for this project.</div>
            ) : (
              <div style={{ position: 'relative', overflowX: 'auto' }}>
                {/* Sort matrix by support level (L1-L5) before rendering */}
                {(() => {
                  const supportOrder = ["L1","L2","L3","L4","L5"];
                  matrix.sort((a, b) => {
                    const aIdx = supportOrder.indexOf(a.support_level || "");
                    const bIdx = supportOrder.indexOf(b.support_level || "");
                    return aIdx - bIdx;
                  });
                  return null;
                })()}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-highlight)' }}>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Support Level</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Name</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Email</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Contact Number</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Role</th>
                      <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map(member => (
                      <tr key={member.user_id} style={{ background: 'var(--primary-bg)', borderBottom: '1px solid var(--primary-shadow)', color: 'var(--primary-color)' }}>
                        <td style={{ padding: 8 }}>
                          {member.support_level ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 14px',
                              borderRadius: 12,
                              fontWeight: 700,
                              fontSize: 15,
                              background: member.support_level === 'L1' ? '#43a047' :
                                         member.support_level === 'L2' ? '#1976d2' :
                                         member.support_level === 'L3' ? '#ffa000' :
                                         member.support_level === 'L4' ? '#8e24aa' :
                                         member.support_level === 'L5' ? '#b00020' : '#bdbdbd',
                              color: '#fff',
                              letterSpacing: 1,
                              boxShadow: '0 1px 4px #0001',
                            }}>{member.support_level}</span>
                          ) : <span style={{ color: '#888' }}>-</span>}
                        </td>
                        <td style={{ padding: 8 }}>{member.name}</td>
                        <td style={{ padding: 8 }}>{member.email}</td>
                        <td style={{ padding: 8 }}>{member.contact_number || '-'}</td>
                        <td style={{ padding: 8 }}>{member.role}</td>
                        <td style={{ padding: 8 }}>{member.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Ribbon notification for Escalation Matrix */}
            {matrixRibbon && (
              <div style={{
                position: 'fixed',
                right: 32,
                bottom: 32,
                background: matrixRibbonType === 'success' ? '#43a047' : '#b00020',
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
                {matrixRibbon}
              </div>
            )}
            {/* Removed old Export Projects buttons, icons are now available */}
          </>
        )}
      </div>
      {error && <div style={{ color: '#b00020', textAlign: 'center', marginBottom: 16 }}>{error}</div>}
  </div>
);
};

// Helper: Render a hidden clone of the hierarchy tree for full image export
function renderHiddenClone(hierarchy, CustomHierarchyTree) {
  const cloneDiv = document.createElement('div');
  cloneDiv.style.position = 'fixed';
  cloneDiv.style.left = '-9999px';
  cloneDiv.style.top = '0';
  cloneDiv.style.width = 'auto';
  cloneDiv.style.height = 'auto';
  cloneDiv.style.overflow = 'visible';
  cloneDiv.style.background = getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#f5f7fa';
  document.body.appendChild(cloneDiv);
  // Render the tree into the clone using React portal
  import('react-dom').then(ReactDOM => {
    ReactDOM.createRoot(cloneDiv).render(
      <CustomHierarchyTree roots={hierarchy} />
    );
  });
  return cloneDiv;
}

// Wrapper component to handle ref and image download
function HierarchyWithDownload({ hierarchy, handleExport }) {
  const treeRef = useRef();

  const handleImageDownload = async () => {
    // Render a hidden clone for full capture
    const ReactDOM = await import('react-dom/client');
    const cloneDiv = document.createElement('div');
    cloneDiv.style.position = 'fixed';
    cloneDiv.style.left = '-9999px';
    cloneDiv.style.top = '0';
    cloneDiv.style.width = 'auto';
    cloneDiv.style.height = 'auto';
    cloneDiv.style.overflow = 'visible';
    cloneDiv.style.background = getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#f5f7fa';
    document.body.appendChild(cloneDiv);
    // Render the tree into the clone
    const root = ReactDOM.createRoot(cloneDiv);
    root.render(<CustomHierarchyTree roots={hierarchy} />);
    // Wait for layout
    await new Promise(res => setTimeout(res, 100));
    try {
      const dataUrl = await toPng(cloneDiv, { cacheBust: true, backgroundColor: getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#f5f7fa' });
      const link = document.createElement('a');
      link.download = 'user_hierarchy.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Failed to generate image. Try zooming out or reducing tree size.');
    } finally {
      // Clean up
      root.unmount();
      document.body.removeChild(cloneDiv);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
      <div ref={treeRef} style={{ margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
        <CustomHierarchyTree roots={hierarchy} />
      </div>
    </div>
  );
}

// Helper to detect dark mode
const isDarkMode = () => document.body.classList.contains('theme-dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;

// Custom tooltip style for dark mode
const getTooltipStyle = () => ({
  backgroundColor: isDarkMode() ? '#23272f' : '#fff',
  color: isDarkMode() ? '#f1f1f1' : '#222',
  border: isDarkMode() ? '1px solid #444' : '1.5px solid #bbb',
  borderRadius: 10,
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  fontSize: 15,
  boxShadow: isDarkMode() ? '0 2px 8px #0003' : '0 2px 12px #bbb3',
  padding: 12,
});
const getLegendStyle = () => ({
  color: isDarkMode() ? '#f1f1f1' : '#222',
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  fontSize: 15,
});
const getCardBg = () => isDarkMode() ? 'var(--primary-bg)' : '#f5f7fa';

// Add a style object for chart card hover effect
const chartCardBaseStyle = {
  borderRadius: 16,
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflow: 'visible',
  transition: 'transform 0.18s cubic-bezier(.4,1.3,.5,1), box-shadow 0.18s cubic-bezier(.4,1.3,.5,1)',
  cursor: 'pointer',
};
const getChartCardStyle = () => ({
  ...chartCardBaseStyle,
  background: getCardBg(),
  boxShadow: isDarkMode() ? '0 2px 8px var(--primary-shadow)' : '0 2px 12px #bbb3',
  border: isDarkMode() ? undefined : '1.5px solid #e0e0e0',
});
const getChartCardHoverStyle = () => ({
  transform: 'scale(1.035)',
  boxShadow: isDarkMode() ? '0 6px 24px var(--primary-shadow)' : '0 8px 32px #bbb5',
});

// Helper for axis tick style
const getAxisTickStyle = () => ({
  fontFamily: "'FK Grotesk', Arial, sans-serif",
  fontSize: 15,
  fill: isDarkMode() ? '#f1f1f1' : '#444',
  fontWeight: 'bold',
  letterSpacing: 0.2,
});

export default AdminDashboard; 