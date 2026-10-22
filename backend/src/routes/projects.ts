import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET all projects for current user
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM db_tables t WHERE t.project_id = p.id) AS table_count,
        (SELECT COUNT(*) FROM queries q WHERE q.project_id = p.id) AS query_count
      FROM projects p 
      WHERE p.user_id = ? 
      ORDER BY p.updated_at DESC
    `).all(req.userId);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET single project
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST create project
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, description, db_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, user_id, name, description, db_type) VALUES (?, ?, ?, ?, ?)
    `).run(id, req.userId, name, description || '', db_type || 'mysql');

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT update project
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, description, db_type } = req.body;
    const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    db.prepare(`
      UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), 
        db_type = COALESCE(?, db_type), updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, db_type, req.params.id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET schema for a project (tables + columns + relationships)
router.get('/:id/schema', (req: AuthRequest, res: Response) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tables = db.prepare('SELECT * FROM db_tables WHERE project_id = ? ORDER BY created_at').all(req.params.id) as any[];
    for (const table of tables) {
      table.columns = db.prepare('SELECT * FROM columns WHERE table_id = ? ORDER BY order_index').all(table.id);
      table.indexes = db.prepare('SELECT * FROM indexes WHERE table_id = ?').all(table.id);
    }

    const relationships = db.prepare('SELECT * FROM relationships WHERE project_id = ?').all(req.params.id);

    res.json({ project, tables, relationships });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// POST add table to project
router.post('/:id/tables', (req: AuthRequest, res: Response) => {
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { name, description, position_x, position_y, columns } = req.body;
    if (!name) return res.status(400).json({ error: 'Table name is required' });

    const tableId = uuidv4();
    db.prepare(`
      INSERT INTO db_tables (id, project_id, name, description, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?)
    `).run(tableId, req.params.id, name, description || '', position_x || 100, position_y || 100);

    // If columns provided, insert them
    if (columns && Array.isArray(columns)) {
      const insertCol = db.prepare(`
        INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      columns.forEach((col: any, idx: number) => {
        insertCol.run(uuidv4(), tableId, col.name, col.data_type || 'VARCHAR(255)', col.nullable ?? 1, col.default_val || null, col.is_pk ?? 0, col.is_unique ?? 0, col.auto_increment ?? 0, idx);
      });
    } else {
      // Default id column
      db.prepare(`
        INSERT INTO columns (id, table_id, name, data_type, nullable, is_pk, is_unique, auto_increment, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), tableId, 'id', 'INT', 0, 1, 1, 1, 0);
    }

    const table = db.prepare('SELECT * FROM db_tables WHERE id = ?').get(tableId) as any;
    table.columns = db.prepare('SELECT * FROM columns WHERE table_id = ? ORDER BY order_index').all(tableId);

    res.status(201).json({ table });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

export default router;
