import { db } from '../db/database';

function toId(id: string | string[] | undefined): string | null {
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
}

/**
 * Verify that a project belongs to the authenticated user.
 */
export function verifyProjectOwnership(projectId: string | string[] | undefined, userId: string): boolean {
  const pid = toId(projectId);
  if (!pid || !userId) return false;
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(pid, userId);
  return Boolean(project);
}

/**
 * Verify that a database table belongs to a project owned by the authenticated user.
 */
export function verifyTableOwnership(tableId: string | string[] | undefined, userId: string): boolean {
  const tid = toId(tableId);
  if (!tid || !userId) return false;
  const table = db.prepare(`
    SELECT t.id
    FROM db_tables t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ? AND p.user_id = ?
  `).get(tid, userId);
  return Boolean(table);
}

/**
 * Verify that a relationship belongs to a project owned by the authenticated user.
 */
export function verifyRelationshipOwnership(relationshipId: string | string[] | undefined, userId: string): boolean {
  const rid = toId(relationshipId);
  if (!rid || !userId) return false;
  const rel = db.prepare(`
    SELECT r.id
    FROM relationships r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ? AND p.user_id = ?
  `).get(rid, userId);
  return Boolean(rel);
}
