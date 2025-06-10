import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- Reusable Component for Stat Tiles ---
const StatTile = ({ title, value, icon, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-center space-x-4">
        <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full">{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
);

// --- Reusable Component for Displaying User Hierarchy Nodes ---
const UserNode = ({ user, allUsers, level }) => {
    const subordinates = allUsers.filter(u => u.reportingTo === user.id);
    return (
        <div style={{ marginLeft: `${level * 20}px` }} className="my-2">
            <div className="flex items-center bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm">
                <div className="font-semibold text-gray-800 dark:text-white">{user.displayName || user.email}</div>
                <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">({user.designation || 'N/A'})</div>
            </div>
            {subordinates.length > 0 && (
                <div className="border-l-2 border-blue-500 pl-4">
                    {subordinates.map(sub => <UserNode key={sub.id} user={sub} allUsers={allUsers} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex justify-end gap-2 mb-4">
                            <button onClick={() => downloadAsExcel(hierarchyData, 'user-hierarchy', 'User Hierarchy')} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Download Excel</button>
                            <button onClick={() => downloadAsPdf(hierarchyData, 'User Hierarchy', 'user-hierarchy')} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Download PDF</button>
                        </div>
                        {users.filter(u => !u.reportingTo).map(user => <UserNode key={user.id} user={user} allUsers={users} level={0} />)}
                    </div>
                );
            case 'escalation':
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <label htmlFor="project-select" className="mr-4 font-semibold dark:text-white">Select a Project:</label>
                                <select id="project-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="p-2 rounded-md dark:bg-gray-700 dark:text-white border dark:border-gray-600">
                                    <option value="">-- Select --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {selectedProjectId && (
                                <div className="flex gap-2">
                                    <button onClick={() => downloadAsExcel(escalationMatrix, 'escalation-matrix', `Escalation Matrix: ${selectedProject.name}`)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">Download Excel</button>
                                    <button onClick={() => downloadAsPdf(escalationMatrix, `Escalation Matrix: ${selectedProject.name}`, 'escalation-matrix')} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Download PDF</button>
                                </div>
                            )}
                        </div>
                        {selectedProjectId && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Level</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Designation</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contact Number</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {escalationMatrix.map((item, index) => (
                                            <tr key={item.email + index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.Level}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.User}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.Designation}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.Email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item['Contact Number']}</td>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StatTile title="Total Projects" value={projects.length} onClick={() => navigate('/admin/projects')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                      <StatTile title="Total Users" value={users.length} onClick={() => navigate('/admin/users')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a6 6 0 00-9-5.197" /></svg>} />
                    </div>
                );
        }
    };
    
    const TabButton = ({ name, label }) => (
        <button onClick={() => setActiveTab(name)} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === name ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            {label}
        </button>
    );

  return (
    <div className="flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-2">
                <TabButton name="overview" label="Overview" />
                <TabButton name="hierarchy" label="User Hierarchy" />
                <TabButton name="escalation" label="Project Escalation Matrix" />
            </nav>
        </div>
        <div className="mt-6">
            {renderContent()}
        </div>
    </div>
  );
};

export default AdminDashboardPage;
