 
// Fetch all projects (id, name) for admin selection
export async function fetchAllProjects(token) {
  const res = await fetch('/api/admin/dashboard/projects?limit=1000', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
} 

// List projects with search and pagination
export async function listProjects(token, { search = '', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ search, page, limit });
  const res = await fetch(`/api/admin/dashboard/projects?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

// Create project
export async function createProject(token, project) {
  const res = await fetch('/api/admin/dashboard/projects', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create project');
  return data;
}

// Update project
export async function updateProject(token, id, project) {
  const res = await fetch(`/api/admin/dashboard/projects/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update project');
  return data;
}

// Delete project
export async function deleteProject(token, id) {
  const res = await fetch(`/api/admin/dashboard/projects/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete project');
  return data;
} 