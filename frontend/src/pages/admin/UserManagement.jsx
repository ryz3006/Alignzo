import React, { useEffect, useState } from "react";
import { listUsers, createUser, updateUser, deleteUser } from "../../api/users";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listProjects } from "../../api/projects";

const UserManagement = () => {
  const { adminToken } = useAdminAuth();
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(10);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user", manager_id: "" });
  const [userFormError, setUserFormError] = useState("");
  const [userDeleteLoading, setUserDeleteLoading] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]); // for multi-select

  useEffect(() => {
    if (!adminToken) return;
    setUsersLoading(true);
    listUsers(adminToken, { search: userSearch, page: userPage, limit: userLimit })
      .then(res => { setUsers(res.users); setUsersTotal(res.total); setUsersError(null); })
      .catch(e => setUsersError(e.message))
      .finally(() => setUsersLoading(false));
  }, [adminToken, userSearch, userPage, userLimit]);

  // Fetch projects when modal opens
  useEffect(() => {
    if (showUserModal && adminToken) {
      listProjects(adminToken, { page: 1, limit: 1000 })
        .then(res => setAllProjects(res.projects))
        .catch(() => setAllProjects([]));
      // If editing, set userProjects from editingUser
      if (editingUser && editingUser.project_ids) {
        setUserProjects(editingUser.project_ids);
      } else {
        setUserProjects([]);
      }
    }
  }, [showUserModal, adminToken, editingUser]);

  const openCreateUser = () => { setEditingUser(null); setUserForm({ name: "", email: "", password: "", role: "user", manager_id: "" }); setUserFormError(""); setShowUserModal(true); };
  const openEditUser = (user) => { setEditingUser(user); setUserForm({ ...user, password: "" }); setUserFormError(""); setShowUserModal(true); };
  const closeUserModal = () => { setShowUserModal(false); setEditingUser(null); setUserFormError(""); };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    setUserFormError("");
    try {
      const payload = { ...userForm, project_ids: userProjects };
      if (editingUser) {
        await updateUser(adminToken, editingUser.id, payload);
      } else {
        if (!userForm.password) throw new Error("Password is required for new users");
        await createUser(adminToken, payload);
      }
      closeUserModal();
      setUserPage(1);
      setUserSearch("");
    } catch (err) {
      setUserFormError(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setUserDeleteLoading(id);
    try {
      await deleteUser(adminToken, id);
      setUserPage(1);
      setUserSearch("");
    } catch (err) {
      alert(err.message);
    } finally {
      setUserDeleteLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto 32px auto', background: '#f7f8fa', borderRadius: 16, padding: 16 }}>
      <h3 style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 12 }}>User Management</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search users..."
          value={userSearch}
          onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
          style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", flex: 1, minWidth: 120 }}
        />
        <button
          style={{ padding: '8px 16px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          onClick={openCreateUser}
        >+ Add User</button>
      </div>
      {usersLoading ? (
        <div style={{ color: '#888' }}>Loading users...</div>
      ) : usersError ? (
        <div style={{ color: '#b00020' }}>{usersError}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
            <thead>
              <tr style={{ background: '#e3f0ff' }}>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Name</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Email</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Role</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Manager</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{user.name}</td>
                  <td style={{ padding: 8 }}>{user.email}</td>
                  <td style={{ padding: 8 }}>{user.role}</td>
                  <td style={{ padding: 8 }}>{user.manager_id || '-'}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button style={{ padding: '4px 10px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#e3f0ff', color: '#1a4b7a', border: 'none', cursor: 'pointer' }} onClick={() => openEditUser(user)}>Edit</button>
                    <button style={{ padding: '4px 10px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#ffe3e3', color: '#7a1a1a', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteUser(user.id)} disabled={userDeleteLoading === user.id}>{userDeleteLoading === user.id ? 'Deleting...' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} style={{ padding: '6px 12px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: userPage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
        <span style={{ fontFamily: "'FK Grotesk', Arial, sans-serif" }}>Page {userPage} of {Math.ceil(usersTotal / userLimit) || 1}</span>
        <button onClick={() => setUserPage(p => p + 1)} disabled={userPage * userLimit >= usersTotal} style={{ padding: '6px 12px', borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: 'none', background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, cursor: userPage * userLimit >= usersTotal ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
      {/* User Modal */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleUserFormSubmit} style={{ background: '#fff', borderRadius: 14, padding: 28, minWidth: 320, maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.13)', fontFamily: "'FK Grotesk', Arial, sans-serif", display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ margin: 0, fontWeight: 700 }}>{editingUser ? 'Edit User' : 'Add User'}</h4>
            <input type="text" placeholder="Name" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />
            <input type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />
            {!editingUser && <input type="password" placeholder="Password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />}
            <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <input type="text" placeholder="Manager ID (optional)" value={userForm.manager_id || ""} onChange={e => setUserForm(f => ({ ...f, manager_id: e.target.value }))} style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif" }} />
            {/* Multi-select for projects */}
            <label style={{ fontWeight: 500 }}>Assign Projects</label>
            <select multiple value={userProjects} onChange={e => setUserProjects(Array.from(e.target.selectedOptions, o => o.value))} style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", minHeight: 80 }}>
              {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {userFormError && <div style={{ color: '#b00020' }}>{userFormError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#e3f0ff', color: '#1a4b7a', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{editingUser ? 'Update' : 'Create'}</button>
              <button type="button" onClick={closeUserModal} style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: '#eee', color: '#444', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 