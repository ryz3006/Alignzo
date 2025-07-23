export async function getCurrentUser(token) {
  const res = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Not authorized");
  return res.json();
}

// Fetch admin dashboard stats (total users and projects)
export async function fetchAdminStats(token) {
  const res = await fetch('/api/admin/dashboard/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return res.json();
}

// Fetch user hierarchy (org chart)
export async function fetchUserHierarchy(token) {
  const res = await fetch('/api/admin/dashboard/users/hierarchy', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch user hierarchy');
  return res.json();
}

// Fetch escalation matrix for a project
export async function fetchEscalationMatrix(token, projectId) {
  const res = await fetch(`/api/admin/dashboard/projects/${projectId}/escalation-matrix`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch escalation matrix');
  return res.json();
}

// Export users or projects as PDF/Excel
export async function exportReport(token, type, format = 'excel', projectId = null) {
  let url = `/api/admin/dashboard/export/${type}?format=${format}`;
  if (type === 'escalation-matrix' && projectId) {
    url += `&projectId=${projectId}`;
  }
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to export report');
  return res;
}

// List users with search and pagination
export async function listUsers(token, { search = '', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ search, page, limit });
  const res = await fetch(`/api/admin/dashboard/users?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

// Create user
export async function createUser(token, user) {
  const res = await fetch('/api/admin/dashboard/users', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create user');
  return data;
}

// Update user
export async function updateUser(token, id, user) {
  const res = await fetch(`/api/admin/dashboard/users/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update user');
  return data;
}

// Delete user
export async function deleteUser(token, id) {
  const res = await fetch(`/api/admin/dashboard/users/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete user');
  return data;
}

// List all settings
export async function listSettings(token) {
  const res = await fetch('/api/admin/dashboard/settings', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

// Get setting by key
export async function getSetting(token, key) {
  const res = await fetch(`/api/admin/dashboard/settings/${key}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch setting');
  return data;
}

// Create or update setting
export async function saveSetting(token, key, value) {
  const res = await fetch('/api/admin/dashboard/settings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save setting');
  return data;
}

// Delete setting
export async function deleteSetting(token, key) {
  const res = await fetch(`/api/admin/dashboard/settings/${key}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete setting');
  return data;
}

// Fetch projects assigned to the current user
export async function getMyProjects(token, email) {
  const res = await fetch(`/api/users/my-projects?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || "Failed to fetch user projects");
  return data;
} 