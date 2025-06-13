import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Import the Supabase client
import { useAuth } from '../../contexts/AuthContext';

// Helper function to dynamically load scripts if they aren't already loaded
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
    });
};

// --- Reusable Styled Components for this page ---

const StatTile = ({ title, value, icon, onClick }) => (
    <div onClick={onClick} className="neumorph-outset" style={{padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease-in-out'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <div className="neumorph-outset" style={{width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0}}>
          <span className="text-primary">{icon}</span>
        </div>
        <div>
          <p style={{margin: 0, fontSize: '0.9rem', fontWeight: 500}} className="text-strong">{title}</p>
          <p style={{margin: '0', fontSize: '2.25rem', fontWeight: '700'}} className="text-strong">{value}</p>
        </div>
      </div>
    </div>
);

const UserNode = ({ user, allUsers, level }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const subordinates = allUsers.filter(u => u.reporting_to === user.id);
    return (
        <div style={{ position: 'relative', paddingLeft: '30px' }}>
             <style>{`
                .node-connector::before {
                    content: '';
                    position: absolute;
                    left: 12px;
                    top: -14px;
                    height: 100%;
                    border-left: 2px solid var(--light-primary);
                }
                html.dark .node-connector::before {
                    border-left-color: var(--dark-primary);
                }
                .node-connector-entry::after {
                    content: '';
                    position: absolute;
                    left: 12px;
                    top: 22px;
                    width: 18px;
                    height: 2px;
                    background-color: var(--light-primary);
                }
                html.dark .node-connector-entry::after {
                    background-color: var(--dark-primary);
                }
             `}</style>
            <div className="node-connector-entry" style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    className="btn neumorph-outset" 
                    style={{ borderRadius: '50%', padding: '0.5rem', marginRight: '10px', visibility: subordinates.length > 0 ? 'visible' : 'hidden' }}
                >
                    <svg style={{width: '1rem', height: '1rem', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </button>
                <div className="neumorph-inset" style={{padding: '0.75rem 1rem', borderRadius: '8px', flexGrow: 1}}>
                    <span style={{fontWeight: '600'}} className="text-strong">{user.display_name || user.email}</span>
                    <span style={{marginLeft: '0.5rem', fontSize: '0.8rem'}}>({user.designation || 'N/A'})</span>
                </div>
            </div>
            {isExpanded && subordinates.length > 0 && (
                <div className="node-connector">
                    {subordinates.map(sub => <UserNode key={sub.id} user={sub} allUsers={allUsers} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

const DashboardTabButton = ({ active, onClick, children, icon }) => (
    <button type="button" onClick={onClick} className={`modern-tab-btn ${active ? 'active' : ''}`}>
        <span style={{width: '24px', height: '24px'}}>{icon}</span>
        <span className="hidden md:inline">{children}</span>
    </button>
);

const DownloadButton = ({ onClick, children }) => (
    <button onClick={onClick} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        {children}
    </button>
);

// --- Main Dashboard Page Component ---
const AdminDashboardPage = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const { setIsAppLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        setIsAppLoading(true);

        const loadLibraries = async () => {
            await Promise.all([
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"),
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
            ]).catch(error => console.error("Could not load download scripts:", error));
        };
        
        const fetchData = async () => {
            try {
                const [usersRes, projectsRes, settingsRes] = await Promise.all([
                    supabase.from('users').select('*'),
                    supabase.from('projects').select('*'),
                    supabase.from('settings').select('id, value')
                ]);

                if (usersRes.error) throw usersRes.error;
                if (projectsRes.error) throw projectsRes.error;
                if (settingsRes.error) throw settingsRes.error;

                setUsers(usersRes.data || []);
                setProjects(projectsRes.data || []);
                
                const designationsSetting = settingsRes.data.find(s => s.id === 'designations');
                if (designationsSetting) {
                    setDesignations(designationsSetting.value.list || []);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                alert("Could not load dashboard data.");
            } finally {
                setIsAppLoading(false);
            }
        };
        
        loadLibraries();
        fetchData();

        // Note: For real-time updates with Supabase, you would set up subscriptions here.
    }, [setIsAppLoading]);
    
    const userMap = useMemo(() => users.reduce((acc, u) => ({...acc, [u.id]: u}), {}), [users]);

    const hierarchyData = useMemo(() => {
        const data = [];
        const buildHierarchy = (user, level) => {
            data.push({
                Level: `L${level}`,
                User: user.display_name || user.email,
                Designation: user.designation || 'N/A',
                'Reporting To': userMap[user.reporting_to]?.display_name || 'N/A'
            });
            const subordinates = users.filter(u => u.reporting_to === user.id);
            subordinates.forEach(sub => buildHierarchy(sub, level + 1));
        };
        users.filter(u => !u.reporting_to).forEach(topLevelUser => buildHierarchy(topLevelUser, 1));
        return data;
    }, [users, userMap]);
    
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const escalationMatrix = useMemo(() => {
        if (!selectedProject) return [];
        const projectUsers = users.filter(u => (u.mapped_projects || []).includes(selectedProjectId));
        // ... (Escalation matrix logic remains the same)
    }, [selectedProjectId, users, designations, selectedProject, userMap]);

    const downloadAsExcel = (data, filename, title) => {
        // ... (Download logic remains the same)
    };

    const downloadAsPdf = (data, title, filename) => {
        // ... (Download logic remains the same)
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'hierarchy':
                return (
                    <div className="neumorph-outset" style={{padding: '1.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1rem'}}>
                            <DownloadButton onClick={() => downloadAsExcel(hierarchyData, 'user-hierarchy', 'User Hierarchy')}>&#128196; Excel</DownloadButton>
                            <DownloadButton onClick={() => downloadAsPdf(hierarchyData, 'User Hierarchy', 'user-hierarchy')}>&#128196; PDF</DownloadButton>
                        </div>
                        {users.filter(u => !u.reporting_to).map(user => <UserNode key={user.id} user={user} allUsers={users} />)}
                    </div>
                );
            case 'escalation':
                return (
                    <div className="neumorph-outset" style={{padding: '1.5rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
                            <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px', flexGrow: 1}}>
                                <select id="project-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="input-field" style={{paddingRight: '2rem', minWidth: '250px'}}>
                                    <option value="">-- Select a Project --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {selectedProjectId && (
                                <div style={{display: 'flex', gap: '1rem'}}>
                                    <DownloadButton onClick={() => downloadAsExcel(escalationMatrix, 'escalation-matrix', `Escalation Matrix: ${selectedProject.name}`)}>&#128196; Excel</DownloadButton>
                                    <DownloadButton onClick={() => downloadAsPdf(escalationMatrix, `Escalation Matrix: ${selectedProject.name}`, 'escalation-matrix')}>&#128196; PDF</DownloadButton>
                                </div>
                            )}
                        </div>
                        {selectedProjectId && (
                            <div style={{overflowX: 'auto'}}>
                                <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
                                    <thead>
                                        <tr>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Level</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">User</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Designation</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Email</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}} className="text-strong">Contact Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalationMatrix.map((item, index) => (
                                            <tr key={item.Email + index} className="neumorph-outset" style={{borderRadius: '12px'}}>
                                                <td style={{padding: '1rem'}} className="text-strong">{item.Level}</td>
                                                <td style={{padding: '1rem'}}>{item.User}</td>
                                                <td style={{padding: '1rem'}}>{item.Designation}</td>
                                                <td style={{padding: '1rem'}}>{item.Email}</td>
                                                <td style={{padding: '1rem'}}>{item['Contact Number']}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            case 'overview':
            default:
                return (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem'}}>
                      <StatTile title="Total Projects" value={projects.length} onClick={() => navigate('/admin/projects')} icon={<span>&#128188;</span>} />
                      <StatTile title="Total Users" value={users.length} onClick={() => navigate('/admin/users')} icon={<span>&#128101;</span>} />
                    </div>
                );
        }
    };
    
    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
                <DashboardTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<span>&#128202;</span>}>Overview</DashboardTabButton>
                <DashboardTabButton active={activeTab === 'hierarchy'} onClick={() => setActiveTab('hierarchy')} icon={<span>&#128101;</span>}>User Hierarchy</DashboardTabButton>
                <DashboardTabButton active={activeTab === 'escalation'} onClick={() => setActiveTab('escalation')} icon={<span>&#128226;</span>}>Escalation Matrix</DashboardTabButton>
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
