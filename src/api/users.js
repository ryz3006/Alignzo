export async function getCurrentUser(token) {
  const res = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Not authorized");
  return res.json();
} 