import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// PUT update table
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, description, position_x, position_y } = req.body;
    db.prepare(`
      UPDATE db_tables SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        position_x = COALESCE(?, position_x),
        position_y = COALESCE(?, position_y),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, position_x, position_y, req.params.id);

    const table = db.prepare('SELECT * FROM db_tables WHERE id = ?').get(req.params.id) as any;
    if (!table) return res.status(404).json({ error: 'Table not found' });
    table.columns = db.prepare('SELECT * FROM columns WHERE table_id = ? ORDER BY order_index').all(table.id);
    res.json({ table });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// DELETE table
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM db_tables WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// POST add column to table
router.post('/:id/columns', (req: AuthRequest, res: Response) => {
  try {
    const { name, data_type, nullable, default_val, is_pk, is_unique, auto_increment } = req.body;
    if (!name) return res.status(400).json({ error: 'Column name is required' });

    const count = db.prepare('SELECT COUNT(*) as cnt FROM columns WHERE table_id = ?').get(req.params.id) as any;
    const orderIndex = count ? count.cnt : 0;

    const colId = uuidv4();
    db.prepare(`
      INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(colId, req.params.id, name, data_type || 'VARCHAR(255)', nullable ?? 1, default_val || null, is_pk ?? 0, is_unique ?? 0, auto_increment ?? 0, orderIndex);

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(colId);
    res.status(201).json({ column });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add column' });
  }
});

// PUT update column
router.put('/:tableId/columns/:colId', (req: AuthRequest, res: Response) => {
  try {
    const { name, data_type, nullable, default_val, is_pk, is_unique, auto_increment } = req.body;
    db.prepare(`
      UPDATE columns SET
        name = COALESCE(?, name),
        data_type = COALESCE(?, data_type),
        nullable = COALESCE(?, nullable),
        default_val = ?,
        is_pk = COALESCE(?, is_pk),
        is_unique = COALESCE(?, is_unique),
        auto_increment = COALESCE(?, auto_increment)
      WHERE id = ? AND table_id = ?
    `).run(name, data_type, nullable, default_val || null, is_pk, is_unique, auto_increment, req.params.colId, req.params.tableId);

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.colId);
    res.json({ column });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// DELETE column
router.delete('/:tableId/columns/:colId', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM columns WHERE id = ? AND table_id = ?').run(req.params.colId, req.params.tableId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// PUT save full columns array for a table
router.put('/:id/columns', (req: AuthRequest, res: Response) => {
  try {
    const { columns } = req.body;
    if (!Array.isArray(columns)) return res.status(400).json({ error: 'columns must be an array' });

    // Delete existing and reinsert
    db.prepare('DELETE FROM columns WHERE table_id = ?').run(req.params.id);
    const insert = db.prepare(`
      INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    columns.forEach((col: any, idx: number) => {
      insert.run(col.id || uuidv4(), req.params.id, col.name, col.data_type || 'VARCHAR(255)', col.nullable ?? 1, col.default_val || null, col.is_pk ?? 0, col.is_unique ?? 0, col.auto_increment ?? 0, idx);
    });

    const saved = db.prepare('SELECT * FROM columns WHERE table_id = ? ORDER BY order_index').all(req.params.id);
    res.json({ columns: saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save columns' });
  }
});

export default router;
