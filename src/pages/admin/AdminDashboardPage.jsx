import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';

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
    const subordinates = allUsers.filter(u => u.reportingTo === user.id);
    return (
        <div style={{ marginLeft: `${level * 25}px`, marginTop: '0.5rem' }}>
            <div className="neumorph-inset" style={{padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center'}}>
                <span style={{fontWeight: '600'}} className="text-strong">{user.displayName || user.email}</span>
                <span style={{marginLeft: '0.5rem', fontSize: '0.8rem'}}>({user.designation || 'N/A'})</span>
            </div>
            {subordinates.length > 0 && (
                <div style={{borderLeft: '2px solid var(--light-primary)', paddingLeft: '20px', marginTop: '0.5rem'}} className="dark:border-l-[var(--dark-primary)]">
                    {subordinates.map(sub => <UserNode key={sub.id} user={sub} allUsers={allUsers} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

const DashboardTabButton = ({ active, onClick, children, icon }) => (
    <button type="button" onClick={onClick} className={`btn ${active ? 'neumorph-inset text-primary' : 'neumorph-outset'}`} style={{flex: 1, borderRadius: '12px', gap: '0.5rem'}}>
        <span style={{width: '24px', height: '24px'}}>{icon}</span>
        <span className="hidden md:inline">{children}</span>
    </button>
);

const DownloadButton = ({ onClick, children }) => (
    <button onClick={onClick} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px'}}>
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
    const navigate = useNavigate();

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubProjects = onSnapshot(collection(db, "projects"), snap => setProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubDesignations = onSnapshot(doc(db, 'settings', 'designations'), d => setDesignations(d.exists() ? d.data().list : []));
        return () => { unsubUsers(); unsubProjects(); unsubDesignations(); };
    }, []);
    
    const userMap = useMemo(() => users.reduce((acc, u) => ({...acc, [u.id]: u}), {}), [users]);
    const hierarchyData = useMemo(() => {
        const data = [];
        const buildHierarchy = (user, level) => {
            data.push({
                Level: `L${level}`,
                User: user.displayName || user.email,
                Designation: user.designation || 'N/A',
                'Reporting To': userMap[user.reportingTo]?.displayName || 'N/A'
            });
            const subordinates = users.filter(u => u.reportingTo === user.id);
            subordinates.forEach(sub => buildHierarchy(sub, level + 1));
        };
        users.filter(u => !u.reportingTo).forEach(topLevelUser => buildHierarchy(topLevelUser, 1));
        return data;
    }, [users, userMap]);
    
    const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

    const escalationMatrix = useMemo(() => {
        if (!selectedProject) return [];
        const projectUsers = users.filter(u => (u.mappedProjects || []).includes(selectedProjectId));
        const getSortOrder = (designation) => {
            const order = [...designations].reverse().indexOf(designation);
            return order === -1 ? Infinity : order;
        };
        const sortedUsers = projectUsers.sort((a, b) => getSortOrder(a.designation) - getSortOrder(b.designation));

        const matrix = [];
        if (selectedProject.commonContactEmail || selectedProject.commonContactNumber) {
            matrix.push({
                Level: 'L1',
                User: 'Common Contact',
                Designation: 'L1 Support',
                Email: selectedProject.commonContactEmail || 'N/A',
                'Contact Number': selectedProject.commonContactNumber || 'N/A'
            });
        }
        if (sortedUsers.length > 0) {
            let levelCounter = matrix.length + 1;
            let lastDesignation = sortedUsers[0]?.designation;
            sortedUsers.forEach((user, index) => {
                if (index > 0 && user.designation !== lastDesignation) {
                    levelCounter++;
                }
                matrix.push({
                    Level: `L${levelCounter}`,
                    User: user.displayName || user.email,
                    Designation: user.designation,
                    Email: user.email,
                    'Contact Number': user.contactNumber || 'N/A'
                });
                lastDesignation = user.designation;
            });
        }
        return matrix;
    }, [selectedProjectId, users, designations, selectedProject]);

    const downloadAsExcel = (data, filename, title) => {
        if (!window.XLSX) return alert("Excel library not loaded yet.");
        if (data.length === 0) return alert("No data available to download.");
        const timestamp = `Downloaded from Alignzo dashboard at ${new Date().toLocaleString()}`;
        const finalData = [[title], [timestamp], []].concat([Object.keys(data[0])]).concat(data.map(row => Object.values(row)));
        const worksheet = window.XLSX.utils.aoa_to_sheet(finalData);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        window.XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    const downloadAsPdf = (data, title, filename) => {
        if (!window.jspdf) return alert("PDF library not loaded yet.");
        if (data.length === 0) return alert("No data to download.");
        
        // Correct way to instantiate jsPDF when loaded from a CDN
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        if (typeof doc.autoTable !== 'function') {
            console.error("jsPDF-AutoTable plugin is not loaded correctly.");
            alert("Could not generate PDF table. Plugin is missing.");
            return;
        }

        doc.text(title, 14, 16);
        doc.autoTable({
            startY: 22,
            head: [Object.keys(data[0])],
            body: data.map(Object.values),
        });
        doc.setFontSize(8);
        doc.text(`Downloaded from Alignzo dashboard at ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
        doc.save(`${filename}.pdf`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'hierarchy':
                return (
                    <div className="neumorph-outset" style={{padding: '1.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1rem'}}>
                            <DownloadButton onClick={() => downloadAsExcel(hierarchyData, 'user-hierarchy', 'User Hierarchy')} isExcel>Download Excel</DownloadButton>
                            <DownloadButton onClick={() => downloadAsPdf(hierarchyData, 'User Hierarchy', 'user-hierarchy')}>Download PDF</DownloadButton>
                        </div>
                        {users.filter(u => !u.reportingTo).map(user => <UserNode key={user.id} user={user} allUsers={users} level={0} />)}
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
                                    <DownloadButton onClick={() => downloadAsExcel(escalationMatrix, 'escalation-matrix', `Escalation Matrix: ${selectedProject.name}`)} isExcel>Download Excel</DownloadButton>
                                    <DownloadButton onClick={() => downloadAsPdf(escalationMatrix, `Escalation Matrix: ${selectedProject.name}`, 'escalation-matrix')}>Download PDF</DownloadButton>
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
                                            <tr key={item.email + index} className="neumorph-outset" style={{borderRadius: '12px'}}>
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
            <div className="neumorph-inset" style={{display: 'flex', borderRadius: '15px', padding: '0.5rem', marginBottom: '1.5rem', gap: '0.5rem'}}>
                <DashboardTabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<span>&#128202;</span>}>Overview</DashboardTabButton>
                <DashboardTabButton active={activeTab === 'hierarchy'} onClick={() => setActiveTab('hierarchy')} icon={<span>&#128101;</span>}>Hierarchy</DashboardTabButton>
                <DashboardTabButton active={activeTab === 'escalation'} onClick={() => setActiveTab('escalation')} icon={<span>&#128226;</span>}>Escalation</DashboardTabButton>
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
