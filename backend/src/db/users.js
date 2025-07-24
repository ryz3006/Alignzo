import db from './index.js';

/**
 * Returns true if rateeId is under raterId in the hierarchy for the given project.
 * Walks up the manager chain in the project_members table.
 */
export async function isUserUnder(raterId, rateeId, projectId) {
  // Fetch all project members for the project, with their user_id and manager_id
  const { rows: members } = await db.query(
    `SELECT pm.user_id, u.manager_id
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1`,
    [projectId]
  );
  // Build a map: user_id -> manager_id
  const managerMap = {};
  members.forEach(m => { managerMap[m.user_id] = m.manager_id; });
  // Walk up the manager chain from rateeId
  let current = rateeId;
  while (managerMap[current]) {
    if (managerMap[current] === raterId) return true;
    current = managerMap[current];
  }
  return false;
} 