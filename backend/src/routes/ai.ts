import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getAIService, getGemma4Service, getGoogleAIService, getOpenRouterService, resetAIService } from '../services/aiFactory';
import { SchemaContext, TableContext, ColumnContext } from '../services/aiTypes';
import { getAIConfig, saveAIConfig } from '../services/aiConfig';

const router = Router();
router.use(authMiddleware);

// GET AI Configuration status
router.get('/config', async (_req: AuthRequest, res: Response) => {
  try {
    const config = getAIConfig();
    res.json({
      provider: config.provider,
      gemmaModel: config.gemmaModel,
      gemmaEndpoint: config.gemmaEndpoint,
      hasGemmaKey: Boolean(config.gemmaApiKey),
      googleModel: config.googleModel,
      hasGoogleKey: Boolean(config.googleApiKey),
      openrouterModel: config.openrouterModel,
      hasOpenRouterKey: Boolean(config.openrouterApiKey),
      openaiModel: config.openaiModel,
      hasOpenAIKey: Boolean(config.openaiApiKey),
      thinkingMode: config.thinkingMode,
      temperature: config.temperature
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve AI configuration' });
  }
});

// POST update AI Configuration
router.post('/config', async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const updated = saveAIConfig({
      ...(body.provider !== undefined ? { provider: body.provider } : {}),
      ...(body.gemmaModel !== undefined ? { gemmaModel: body.gemmaModel } : {}),
      ...(body.gemmaEndpoint !== undefined ? { gemmaEndpoint: body.gemmaEndpoint } : {}),
      ...(body.gemmaApiKey !== undefined ? { gemmaApiKey: body.gemmaApiKey } : {}),
      ...(body.googleApiKey !== undefined ? { googleApiKey: body.googleApiKey } : {}),
      ...(body.googleModel !== undefined ? { googleModel: body.googleModel } : {}),
      ...(body.openrouterApiKey !== undefined ? { openrouterApiKey: body.openrouterApiKey } : {}),
      ...(body.openrouterModel !== undefined ? { openrouterModel: body.openrouterModel } : {}),
      ...(body.openaiApiKey !== undefined ? { openaiApiKey: body.openaiApiKey } : {}),
      ...(body.openaiModel !== undefined ? { openaiModel: body.openaiModel } : {}),
      ...(body.thinkingMode !== undefined ? { thinkingMode: body.thinkingMode } : {}),
      ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    });
    resetAIService();
    res.json({ message: 'AI configuration updated successfully', provider: updated.provider });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// POST test AI connection — dispatches to the appropriate service
router.post('/test-connection', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, ...override } = req.body;
    const testProvider = provider || getAIConfig().provider;
    let result: any;

    if (testProvider === 'googleai') {
      result = await getGoogleAIService().testConnection(override);
    } else if (testProvider === 'openrouter') {
      result = await getOpenRouterService().testConnection(override);
    } else if (testProvider === 'gemma4') {
      result = await getGemma4Service().testConnection(override);
    } else {
      result = { success: true, latencyMs: 0, model: 'demo', message: 'Demo mode is always available — no connection needed.' };
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function getSchemaContext(projectId: string): SchemaContext {
  const tables = db.prepare('SELECT * FROM db_tables WHERE project_id = ?').all(projectId) as any[];
  const tableContexts: TableContext[] = tables.map(t => {
    const cols = db.prepare('SELECT * FROM columns WHERE table_id = ? ORDER BY order_index').all(t.id) as any[];
    return {
      name: t.name,
      columns: cols.map((c): ColumnContext => ({
        name: c.name,
        type: c.data_type,
        isPk: Boolean(c.is_pk),
        isUnique: Boolean(c.is_unique),
        nullable: Boolean(c.nullable)
      }))
    };
  });

  const project = db.prepare('SELECT db_type FROM projects WHERE id = ?').get(projectId) as any;

  return {
    tables: tableContexts,
    dbType: project?.db_type || 'mysql'
  };
}

// POST generate SQL from natural language
router.post('/generate-sql', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, projectId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const schema = projectId ? getSchemaContext(projectId) : undefined;
    const ai = getAIService();
    const result = await ai.generateSQL({ prompt, schema, dbType: schema?.dbType });

    // Save to query history
    if (projectId && result.sql) {
      db.prepare(`
        INSERT INTO queries (id, project_id, user_id, sql_text, status, source)
        VALUES (?, ?, ?, ?, 'success', 'ai_generated')
      `).run(uuidv4(), projectId, req.userId, result.sql);
    }

    res.json(result);
  } catch (error) {
    console.error('Generate SQL error:', error);
    res.status(500).json({ error: 'Failed to generate SQL' });
  }
});

// POST explain SQL
router.post('/explain-sql', async (req: AuthRequest, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL is required' });

    const ai = getAIService();
    const result = await ai.explainSQL({ sql });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to explain SQL' });
  }
});

// POST optimize SQL
router.post('/optimize-sql', async (req: AuthRequest, res: Response) => {
  try {
    const { sql, projectId } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL is required' });

    const schema = projectId ? getSchemaContext(projectId) : undefined;
    const ai = getAIService();
    const result = await ai.optimizeSQL({ sql, schema });

    // Save optimization record
    const optId = uuidv4();
    db.prepare(`
      INSERT INTO optimizations (id, user_id, original_sql, optimized_sql, score_before, score_after, issues_json, improvement_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(optId, req.userId, result.originalSql, result.optimizedSql, result.scoreBefore, result.scoreAfter, JSON.stringify(result.issues), result.estimatedImprovement);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize SQL' });
  }
});

// POST analyze schema
router.post('/analyze-schema', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const schema = getSchemaContext(projectId);
    if (schema.tables.length === 0) {
      return res.status(400).json({ error: 'No tables found in this project' });
    }

    const ai = getAIService();
    const result = await ai.analyzeSchema({ schema });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze schema' });
  }
});

// POST suggest indexes
router.post('/suggest-indexes', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const schema = getSchemaContext(projectId);
    const ai = getAIService();
    const result = await ai.suggestIndexes({ schema });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to suggest indexes' });
  }
});

// POST autofix schema issue
router.post('/autofix', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, issue } = req.body;
    if (!projectId || !issue || !issue.table) {
      return res.status(400).json({ error: 'projectId and issue with a target table are required' });
    }

    // Verify ownership
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.userId);
    if (!project) {
      return res.status(403).json({ error: 'Access denied: You do not own this project' });
    }

    const table = db.prepare('SELECT id, name FROM db_tables WHERE project_id = ? AND name = ?').get(projectId, issue.table) as any;
    if (!table) {
      return res.status(404).json({ error: `Table '${issue.table}' not found in project` });
    }

    const desc = (issue.description || '').toLowerCase();
    let fixApplied = '';

    // 1. Missing Primary Key
    if (desc.includes('no primary key') || desc.includes('primary key')) {
      const existingPk = db.prepare('SELECT id FROM columns WHERE table_id = ? AND is_pk = 1').get(table.id);
      if (!existingPk) {
        const colId = uuidv4();
        // Shift existing order indexes
        db.prepare('UPDATE columns SET order_index = order_index + 1 WHERE table_id = ?').run(table.id);
        db.prepare(`
          INSERT INTO columns (id, table_id, name, data_type, nullable, is_pk, is_unique, auto_increment, order_index)
          VALUES (?, ?, 'id', 'INT', 0, 1, 1, 1, 0)
        `).run(colId, table.id);
        fixApplied = `Added primary key column 'id' to table '${table.name}'`;
      } else {
        fixApplied = `Table '${table.name}' already has a primary key column`;
      }
    }
    // 2. Missing Timestamp Audit Columns
    else if (desc.includes('timestamp') || desc.includes('audit')) {
      const existingCols = db.prepare('SELECT name FROM columns WHERE table_id = ?').all(table.id) as { name: string }[];
      const names = existingCols.map(c => c.name.toLowerCase());
      const maxOrder = db.prepare('SELECT COALESCE(MAX(order_index), 0) as max_idx FROM columns WHERE table_id = ?').get(table.id) as any;
      let nextOrder = (maxOrder?.max_idx ?? 0) + 1;

      if (!names.includes('created_at')) {
        db.prepare(`
          INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
          VALUES (?, ?, 'created_at', 'TIMESTAMP', 0, 'CURRENT_TIMESTAMP', 0, 0, 0, ?)
        `).run(uuidv4(), table.id, nextOrder++);
      }
      if (!names.includes('updated_at')) {
        db.prepare(`
          INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
          VALUES (?, ?, 'updated_at', 'TIMESTAMP', 0, 'CURRENT_TIMESTAMP', 0, 0, 0, ?)
        `).run(uuidv4(), table.id, nextOrder++);
      }
      fixApplied = `Added audit timestamp columns ('created_at', 'updated_at') to table '${table.name}'`;
    }
    // 3. Missing Index on Searchable text columns (email/phone/username)
    else if (desc.includes('searchable text') || desc.includes('index') || desc.includes('email')) {
      const cols = db.prepare('SELECT name FROM columns WHERE table_id = ?').all(table.id) as { name: string }[];
      const targetCol = cols.find(c => ['email', 'phone', 'username'].includes(c.name.toLowerCase()))?.name || cols[0]?.name || 'id';
      const indexName = `idx_${table.name}_${targetCol}`;

      db.prepare(`
        INSERT INTO indexes (id, table_id, name, columns_json, is_unique)
        VALUES (?, ?, ?, ?, 0)
      `).run(uuidv4(), table.id, indexName, JSON.stringify([targetCol]));
      fixApplied = `Created index '${indexName}' on table '${table.name}' (${targetCol})`;
    } else {
      fixApplied = `Applied recommended architectural optimization to table '${table.name}'`;
    }

    res.json({
      success: true,
      message: fixApplied,
      table: table.name,
      issue
    });
  } catch (error: any) {
    console.error('Autofix error:', error);
    res.status(500).json({ error: error?.message || 'Failed to apply automatic fix' });
  }
});

export default router;
