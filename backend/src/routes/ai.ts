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

export default router;
