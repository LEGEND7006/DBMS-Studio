import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// POST add relationship
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { project_id, source_table_id, source_column_id, target_table_id, target_column_id, rel_type, on_delete, on_update } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO relationships (id, project_id, source_table_id, source_column_id, target_table_id, target_column_id, rel_type, on_delete, on_update)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, source_table_id, source_column_id, target_table_id, target_column_id, rel_type || 'one_to_many', on_delete || 'CASCADE', on_update || 'CASCADE');

    const rel = db.prepare('SELECT * FROM relationships WHERE id = ?').get(id);
    res.status(201).json({ relationship: rel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// DELETE relationship
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM relationships WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

export default router;
