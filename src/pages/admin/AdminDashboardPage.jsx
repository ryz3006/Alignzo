import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StatTile = ({ title, value, icon, onClick }) => (
    <div onClick={onClick} className="neumorph-outset" style={{padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s ease'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <div className="neumorph-outset" style={{width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'}}>
          {icon}
        </div>
        <div>
          <p style={{margin: 0, fontSize: '0.9rem'}}>{title}</p>
          <p style={{margin: '0', fontSize: '2rem', fontWeight: '700'}} className="text-primary">{value}</p>
        </div>
      </div>
    </div>
);

const UserNode = ({ user, allUsers, level }) => {
    const subordinates = allUsers.filter(u => u.reportingTo === user.id);
    return (
        <div style={{ marginLeft: `${level * 25}px`, marginTop: '0.5rem' }}>
            <div className="neumorph-inset" style={{padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center'}}>
                <span style={{fontWeight: '600'}} className="text-strong">{user.displayName || user.email}</span>
                <span style={{marginLeft: '0.5rem', fontSize: '0.8rem'}}>({user.designation || 'N/A'})</span>
            </div>
            {subordinates.length > 0 && (
                <div style={{borderLeft: '2px solid var(--light-primary)', paddingLeft: '20px', marginTop: '0.5rem'}}>
                    {subordinates.map(sub => <UserNode key={sub.id} user={sub} allUsers={allUsers} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

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
    
    const hierarchyData = useMemo(() => {
        const data = [];
        const buildHierarchy = (user, level, manager) => {
            data.push({
                Level: `L${level}`,
                User: user.displayName || user.email,
                Designation: user.designation || 'N/A',
                'Reporting To': manager
            });
            const subordinates = users.filter(u => u.reportingTo === user.id);
            subordinates.forEach(sub => buildHierarchy(sub, level + 1, user.displayName || user.email));
        };
        users.filter(u => !u.reportingTo).forEach(topLevelUser => buildHierarchy(topLevelUser, 1, 'N/A'));
        return data;
    }, [users]);
    
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
        if (data.length === 0) return alert("No data to download.");
        const timestamp = `Downloaded from Alignzo dashboard at ${new Date().toLocaleString()}`;
        const finalData = [[title], [timestamp], []].concat([Object.keys(data[0])]).concat(data.map(Object.values));
        const worksheet = XLSX.utils.aoa_to_sheet(finalData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    const downloadAsPdf = (data, title, filename) => {
        if (data.length === 0) return alert("No data to download.");
        const doc = new jsPDF();
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
                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem'}}>
                            <button onClick={() => downloadAsExcel(hierarchyData, 'user-hierarchy', 'User Hierarchy')} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px'}}>Download Excel</button>
                            <button onClick={() => downloadAsPdf(hierarchyData, 'User Hierarchy', 'user-hierarchy')} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px'}}>Download PDF</button>
                        </div>
                        {users.filter(u => !u.reportingTo).map(user => <UserNode key={user.id} user={user} allUsers={users} level={0} />)}
                    </div>
                );
            case 'escalation':
                return (
                    <div className="neumorph-outset" style={{padding: '1.5rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
                            <div className="neumorph-inset" style={{padding: '0.25rem', borderRadius: '12px'}}>
                                <select id="project-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="input-field" style={{paddingRight: '2rem'}}>
                                    <option value="">-- Select a Project --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {selectedProjectId && (
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                    <button onClick={() => downloadAsExcel(escalationMatrix, 'escalation-matrix', `Escalation Matrix: ${selectedProject.name}`)} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px'}}>Download Excel</button>
                                    <button onClick={() => downloadAsPdf(escalationMatrix, `Escalation Matrix: ${selectedProject.name}`, 'escalation-matrix')} className="btn neumorph-outset" style={{fontSize: '0.8rem', padding: '8px 12px'}}>Download PDF</button>
                                </div>
                            )}
                        </div>
                        {selectedProjectId && (
                            <div className="overflow-x-auto">
                                <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem'}}>
                                    <thead>
                                        <tr>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}}>Level</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}}>User</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}}>Designation</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}}>Email</th>
                                            <th style={{padding: '0.75rem', textAlign: 'left'}}>Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalationMatrix.map((item, index) => (
                                            <tr key={item.email + index} className="neumorph-outset">
                                                <td style={{padding: '1rem'}}>{item.Level}</td>
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
            <div className="neumorph-inset" style={{display: 'flex', borderRadius: '15px', padding: '0.5rem', marginBottom: '1.5rem'}}>
                <button onClick={() => setActiveTab('overview')} className={`btn ${activeTab === 'overview' ? 'neumorph-outset text-primary' : ''}`} style={{flex: 1}}>Overview</button>
                <button onClick={() => setActiveTab('hierarchy')} className={`btn ${activeTab === 'hierarchy' ? 'neumorph-outset text-primary' : ''}`} style={{flex: 1}}>User Hierarchy</button>
                <button onClick={() => setActiveTab('escalation')} className={`btn ${activeTab === 'escalation' ? 'neumorph-outset text-primary' : ''}`} style={{flex: 1}}>Escalation Matrix</button>
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
