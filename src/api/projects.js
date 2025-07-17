export async function getProjects(token) {
  const res = await fetch("/api/projects", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
} 