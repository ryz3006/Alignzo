import React, { useEffect, useState, useRef } from "react";
import { listUsers, createUser, updateUser, deleteUser } from "../../api/users";
import { useAdminAuth } from "../../contexts/AdminAuthContext";
import { listProjects } from "../../api/projects";
import axios from "axios";
import { MdEdit, MdDelete } from "react-icons/md";

// Custom MultiCheckboxDropdown component
function MultiCheckboxDropdown({ options, selected, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: 8 }} ref={ref}>
      <label style={{ fontWeight: 500, color: 'var(--primary-color)', marginBottom: 4, display: 'block' }}>{label}</label>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          border: '1px solid var(--primary-shadow)',
          borderRadius: 6,
          background: 'var(--primary-bg)',
          color: 'var(--primary-color)',
          padding: '8px',
          minHeight: 40,
          cursor: 'pointer',
          fontFamily: "'FK Grotesk', Arial, sans-serif",
          userSelect: 'none',
        }}
      >
        {selected.length === 0
          ? 'Select projects...'
          : options.filter(o => selected.includes(o.value)).map(o => o.label).join(', ')}
        <span style={{ float: 'right', fontWeight: 700, fontSize: 18, marginLeft: 8 }}>{open ? '\u25B2' : '\u25BC'}</span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: 180,
            overflowY: 'auto',
            background: 'var(--primary-bg)',
            border: '1px solid var(--primary-shadow)',
            borderRadius: 6,
            zIndex: 1001,
            boxShadow: '0 4px 16px #0002',
            marginTop: 2,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: 8, color: '#888' }}>No options</div>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: "'FK Grotesk', Arial, sans-serif",
                background: selected.includes(opt.value) ? 'var(--primary-highlight)' : 'transparent',
                borderRadius: 4,
                marginBottom: 2,
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                style={{ marginRight: 8 }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const UserManagement = () => {
  const { adminToken } = useAdminAuth();
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "user", manager_id: "" });
  const [userFormError, setUserFormError] = useState("");
  const [userDeleteLoading, setUserDeleteLoading] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]); // for multi-select
  const [allManagers, setAllManagers] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);
  const [userDesignation, setUserDesignation] = useState("");
  const [supportLevels, setSupportLevels] = useState([]); // fetched from backend
  const [userSupportLevels, setUserSupportLevels] = useState({}); // { [projectId]: supportLevel }
  const [ribbonMessage, setRibbonMessage] = useState("");
  const [ribbonType, setRibbonType] = useState("success"); // 'success' or 'error'

  useEffect(() => {
    if (!adminToken) return;
    setUsersLoading(true);
    listUsers(adminToken, { search: userSearch, page: userPage, limit: userLimit })
      .then(res => { setUsers(res.users); setUsersTotal(res.total); setUsersError(null); })
      .catch(e => setUsersError(e.message))
      .finally(() => setUsersLoading(false));
  }, [adminToken, userSearch, userPage, userLimit]);

  // Fetch designations when modal opens
  useEffect(() => {
    if (showUserModal && adminToken) {
      // Fetch support levels
      axios.get("/api/admin/dashboard/settings/support-levels", { headers: { Authorization: `Bearer ${adminToken}` } })
        .then(res => setSupportLevels(res.data.support_levels || []))
        .catch(() => setSupportLevels(["L1","L2","L3","L4","L5"]));
      axios.get("/api/admin/dashboard/settings/designations", { headers: { Authorization: `Bearer ${adminToken}` } })
        .then(res => setDesignationsList(res.data.designations || []))
        .catch(() => setDesignationsList([]));
      listUsers(adminToken, { page: 1, limit: 1000 })
        .then(res => setAllManagers(res.users))
        .catch(() => setAllManagers([]));
      listProjects(adminToken, { page: 1, limit: 1000 })
        .then(res => setAllProjects(res.projects))
        .catch(() => setAllProjects([]));
      if (editingUser && editingUser.project_ids) {
        setUserProjects(editingUser.project_ids);
        setUserDesignation(editingUser.designation || "");
        // Prefill support levels for assigned projects if available
        if (editingUser.support_levels) setUserSupportLevels(editingUser.support_levels);
        else setUserSupportLevels({});
      } else {
        setUserProjects([]);
        setUserDesignation("");
        setUserSupportLevels({});
      }
    }
  }, [showUserModal, adminToken, editingUser]);

  const openCreateUser = () => { setEditingUser(null); setUserForm({ name: "", email: "", role: "user", manager_id: "" }); setUserFormError(""); setShowUserModal(true); };
  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      manager_id: user.manager_id || "",
      contact_number: user.contact_number || "",
    });
    setUserProjects(user.project_ids || []);
    setUserDesignation(user.designation || "");
    setUserSupportLevels(user.support_levels || {});
    setShowUserModal(true);
  };
  const closeUserModal = () => { setShowUserModal(false); setEditingUser(null); setUserFormError(""); };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    setUserFormError("");
    try {
      const payload = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        manager_id: userForm.manager_id,
        project_ids: userProjects,
        designation: userDesignation,
        support_levels: userSupportLevels,
        contact_number: userForm.contact_number || "",
      };
      if (editingUser) {
        await updateUser(adminToken, editingUser.id, payload);
      } else {
        try {
          await createUser(adminToken, payload);
        } catch (err) {
          if (err.message && err.message.toLowerCase().includes('email already exists')) {
            setUserFormError('A user with this email already exists.');
            return;
          }
          throw err;
        }
      }
      closeUserModal();
      // Refresh user list after add/edit
      setTimeout(() => {
        listUsers(adminToken, { search: userSearch, page: userPage, limit: userLimit })
          .then(res => { setUsers(res.users); setUsersTotal(res.total); setUsersError(null); })
          .catch(e => setUsersError(e.message));
      }, 100);
    } catch (err) {
      setUserFormError(err.message || 'Failed to save user.');
    }
  };

  const handleDeleteUser = async (id) => {
    // 2-step confirmation
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    if (!window.confirm("Please confirm again: Do you really want to delete this user?")) return;
    setUserDeleteLoading(id);
    try {
      await deleteUser(adminToken, id);
      // Refresh user list after delete
      setTimeout(() => {
        listUsers(adminToken, { search: userSearch, page: userPage, limit: userLimit })
          .then(res => { setUsers(res.users); setUsersTotal(res.total); setUsersError(null); })
          .catch(e => setUsersError(e.message));
      }, 100);
      setRibbonType("success");
      setRibbonMessage("User deleted successfully.");
    } catch (err) {
      setRibbonType("error");
      setRibbonMessage(err.message || "Failed to delete user.");
      alert(err.message);
    } finally {
      setUserDeleteLoading(null);
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
        User Management
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search users..."
          value={userSearch}
          onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
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
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
          }}
          onClick={openCreateUser}
        >
          + Add User
        </button>
      </div>
      {usersLoading ? (
        <div style={{ color: 'var(--primary-color, #888)' }}>Loading users...</div>
      ) : usersError ? (
        <div style={{ color: '#b00020' }}>{usersError}</div>
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
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Name</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Email</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Contact Number</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Designation</th>
                <th style={{ padding: 8, borderRadius: 6, textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.id}
                  style={{
                    background: 'var(--primary-bg)',
                    borderBottom: '1px solid var(--primary-shadow)',
                    color: 'var(--primary-color)',
                  }}
                >
                  <td style={{ padding: 8 }}>{user.name}</td>
                  <td style={{ padding: 8 }}>{user.email}</td>
                  <td style={{ padding: 8 }}>{user.contact_number || '-'}</td>
                  <td style={{ padding: 8 }}>{user.designation || '-'}</td>
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
                      onClick={() => openEditUser(user)}
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
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={userDeleteLoading === user.id}
                      title="Delete"
                    >
                      {userDeleteLoading === user.id ? <span style={{ fontSize: 13 }}>...</span> : <MdDelete />}
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
            value={userLimit}
            onChange={e => { setUserLimit(Number(e.target.value)); setUserPage(1); }}
            style={{ padding: 6, borderRadius: 5, fontFamily: "'FK Grotesk', Arial, sans-serif", border: '1px solid var(--primary-shadow)', background: 'var(--primary-bg)', color: 'var(--primary-color)' }}
          >
            {[5, 10, 25, 50, 100].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setUserPage(p => Math.max(1, p - 1))}
            disabled={userPage === 1}
            style={{
              padding: '6px 12px',
              borderRadius: 5,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: userPage === 1 ? 'not-allowed' : 'pointer',
              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
            }}
          >
            Prev
          </button>
          <span style={{ fontFamily: "'FK Grotesk', Arial, sans-serif", color: 'var(--primary-color)' }}>
            Page {userPage} of {Math.ceil(usersTotal / userLimit) || 1}
          </span>
          <button
            onClick={() => setUserPage(p => p + 1)}
            disabled={userPage * userLimit >= usersTotal}
            style={{
              padding: '6px 12px',
              borderRadius: 5,
              fontFamily: "'FK Grotesk', Arial, sans-serif",
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: userPage * userLimit >= usersTotal ? 'not-allowed' : 'pointer',
              boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)',
            }}
          >
            Next
          </button>
        </div>
      </div>
      {/* User Modal */}
      {showUserModal && (
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
            onSubmit={handleUserFormSubmit}
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-color)', minWidth: 120 }}>
                {editingUser ? 'Edit User' : 'Add User'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                <label style={{ fontWeight: 500, color: 'var(--primary-color)', marginBottom: 2 }}>Manager</label>
                <select
                  value={userForm.manager_id || ""}
                  onChange={e => setUserForm(f => ({ ...f, manager_id: e.target.value }))}
                  style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
                >
                  <option value="">-- No Manager --</option>
                  {allManagers.filter(m => m.id !== editingUser?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: 1 }}>
                <label style={{ fontWeight: 500, color: 'var(--primary-color)', marginBottom: 2 }}>Designation</label>
                <select
                  value={userDesignation}
                  onChange={e => setUserDesignation(e.target.value)}
                  style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
                  required
                >
                  <option value="">-- Select Designation --</option>
                  {designationsList.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <input
              type="text"
              placeholder="Name"
              value={userForm.name}
              onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Email"
                value={userForm.email}
                onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                required
                style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
              />
              <input
                type="text"
                placeholder="Contact Number"
                value={userForm.contact_number || ''}
                onChange={e => setUserForm(f => ({ ...f, contact_number: e.target.value }))}
                style={{ flex: 1, minWidth: 140, padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
              />
            </div>
            {/* Remove this:
            <input
              type="password"
              placeholder="Password"
              value={userForm.password}
              onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
              required
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            />
            */}
            {/* Remove this:
            <select
              value={userForm.role}
              onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
              style={{ padding: 8, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--primary-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            */}
            {/* Assign Projects - multi-select dropdown */}
            <div style={{ margin: '8px 0 0 0' }}>
              <label style={{ fontWeight: 500, color: 'var(--primary-color)', marginBottom: 4, display: 'block' }}>Assign Projects & Support Level</label>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--primary-shadow)', borderRadius: 8, background: 'var(--primary-bg)', boxShadow: '0 2px 8px #0001', padding: 4 }}>
                {allProjects.length === 0 ? (
                  <div style={{ padding: 8, color: '#888' }}>No projects available</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'FK Grotesk', Arial, sans-serif" }}>
                    <thead>
                      <tr style={{ background: 'var(--primary-highlight)' }}>
                        <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Assign</th>
                        <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Project</th>
                        <th style={{ padding: 6, textAlign: 'left', fontWeight: 600 }}>Support Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProjects.map(project => {
                        const assigned = userProjects.includes(project.id);
                        return (
                          <tr key={project.id} style={{ background: 'var(--primary-bg)' }}>
                            <td style={{ padding: 6 }}>
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setUserProjects(prev => [...prev, project.id]);
                                  } else {
                                    setUserProjects(prev => prev.filter(id => id !== project.id));
                                    setUserSupportLevels(prev => {
                                      const copy = { ...prev };
                                      delete copy[project.id];
                                      return copy;
                                    });
                                  }
                                }}
                              />
                            </td>
                            <td style={{ padding: 6 }}>{project.name}</td>
                            <td style={{ padding: 6 }}>
                              <select
                                value={userSupportLevels[project.id] || ""}
                                onChange={e => setUserSupportLevels(prev => ({ ...prev, [project.id]: e.target.value }))}
                                disabled={!assigned}
                                style={{ padding: 6, borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: assigned ? 'var(--primary-highlight)' : '#eee', color: 'var(--primary-color)', border: '1px solid var(--primary-shadow)' }}
                              >
                                <option value="">-- Select --</option>
                                {supportLevels.map(level => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {userFormError && <div style={{ color: '#b00020' }}>{userFormError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: 6, fontFamily: "'FK Grotesk', Arial, sans-serif", background: 'var(--accent)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '2px 2px 6px var(--primary-shadow), -2px -2px 6px var(--primary-highlight)' }}
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={closeUserModal}
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

export default UserManagement; 