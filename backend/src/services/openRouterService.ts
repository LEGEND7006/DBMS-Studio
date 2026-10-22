import {
  AIService,
  AIGenerateSQLInput,
  AIExplainSQLInput,
  AIOptimizeSQLInput,
  AIAnalyzeSchemaInput,
  SQLGenerationResult,
  SQLExplanationResult,
  SQLOptimizationResult,
  SchemaAnalysisResult,
  SchemaContext
} from './aiTypes';
import { DemoAIService } from './demoAIService';
import { AIConfig, getAIConfig } from './aiConfig';

/**
 * OpenRouter Service
 * 
 * OpenRouter is a unified API gateway with a generous free tier.
 * Free API key (no credit card): https://openrouter.ai/keys
 * 
 * Best FREE Gemma/Gemini models on OpenRouter:
 *   google/gemma-3-27b-it:free
 *   google/gemma-3-12b-it:free
 *   google/gemma-3-4b-it:free
 *   google/gemma-2-9b-it:free
 *   google/gemini-2.0-flash-exp:free
 */
export class OpenRouterService implements AIService {
  private fallback = new DemoAIService();

  private async callOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    configOverride?: Partial<AIConfig>
  ): Promise<string> {
    const config = { ...getAIConfig(), ...configOverride };
    const apiKey = config.openrouterApiKey;
    const model = config.openrouterModel || 'google/gemma-3-27b-it:free';

    if (!apiKey) throw new Error('OpenRouter API key is not configured');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Intelligent DBMS Studio'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.temperature ?? 0.2,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenRouter API error ${res.status}: ${errText || res.statusText}`);
    }

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return this.extractJSON(text);
  }

  private extractJSON(raw: string): string {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) s = fence[1].trim();
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last > first) s = s.substring(first, last + 1);
    return s;
  }

  async testConnection(configOverride?: Partial<AIConfig>): Promise<{
    success: boolean; latencyMs: number; model: string; message: string;
  }> {
    const config = { ...getAIConfig(), ...configOverride };
    const model = config.openrouterModel || 'google/gemma-3-27b-it:free';
    const start = Date.now();
    try {
      await this.callOpenRouter('Return valid JSON.', '{"status":"ok"}', configOverride);
      return {
        success: true,
        latencyMs: Date.now() - start,
        model,
        message: `Connected to OpenRouter (${model}) in ${Date.now() - start}ms.`
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        model,
        message: `OpenRouter connection failed: ${err.message}`
      };
    }
  }

  private formatSchema(schema?: SchemaContext): string {
    if (!schema?.tables?.length) return 'No schema loaded.';
    let s = `DB Type: ${schema.dbType || 'mysql'}\n`;
    for (const t of schema.tables) {
      s += `\nTable "${t.name}":\n`;
      for (const c of t.columns) {
        const flags = [c.isPk && 'PK', c.isUnique && 'UNIQUE', !c.nullable && 'NOT NULL'].filter(Boolean).join(' ');
        s += `  ${c.name} ${c.type} ${flags}\n`;
      }
    }
    return s;
  }

  async generateSQL(input: AIGenerateSQLInput): Promise<SQLGenerationResult> {
    const dbType = input.dbType || input.schema?.dbType || 'mysql';
    try {
      const raw = await this.callOpenRouter(
        `You are an expert ${dbType.toUpperCase()} database engineer. Generate optimized SQL.
Return ONLY this JSON:
{"sql":"...","explanation":"...","tablesUsed":["..."],"assumptions":["..."],"performanceConcerns":["..."]}`,
        `Schema:\n${this.formatSchema(input.schema)}\n\nRequest: ${input.prompt}`
      );
      const p = JSON.parse(raw);
      return {
        sql: p.sql || '-- Could not generate SQL',
        explanation: p.explanation || '',
        tablesUsed: Array.isArray(p.tablesUsed) ? p.tablesUsed : [],
        assumptions: Array.isArray(p.assumptions) ? p.assumptions : [],
        performanceConcerns: Array.isArray(p.performanceConcerns) ? p.performanceConcerns : []
      };
    } catch (err: any) {
      console.warn(`[OpenRouter] generateSQL failed: ${err.message} — using fallback`);
      return this.fallback.generateSQL(input);
    }
  }

  async explainSQL(input: AIExplainSQLInput): Promise<SQLExplanationResult> {
    try {
      const raw = await this.callOpenRouter(
        `You are a SQL educator. Explain this SQL query clearly.
Return ONLY this JSON:
{"summary":"...","complexity":"simple"|"moderate"|"complex","breakdown":[{"clause":"...","explanation":"..."}]}`,
        `SQL:\n${input.sql}`
      );
      const p = JSON.parse(raw);
      return {
        summary: p.summary || '',
        complexity: (['simple', 'moderate', 'complex'].includes(p.complexity) ? p.complexity : 'moderate') as any,
        breakdown: Array.isArray(p.breakdown) ? p.breakdown : []
      };
    } catch (err: any) {
      console.warn(`[OpenRouter] explainSQL failed: ${err.message} — using fallback`);
      return this.fallback.explainSQL(input);
    }
  }

  async optimizeSQL(input: AIOptimizeSQLInput): Promise<SQLOptimizationResult> {
    try {
      const raw = await this.callOpenRouter(
        `You are a SQL performance expert. Optimize the query and detect anti-patterns.
Return ONLY this JSON:
{"originalSql":"...","optimizedSql":"...","scoreBefore":45,"scoreAfter":88,"estimatedImprovement":43,"issues":[{"severity":"critical"|"warning"|"info","description":"...","suggestion":"..."}]}`,
        `Schema:\n${this.formatSchema(input.schema)}\n\nSQL:\n${input.sql}`
      );
      const p = JSON.parse(raw);
      return {
        originalSql: input.sql,
        optimizedSql: p.optimizedSql || input.sql,
        scoreBefore: typeof p.scoreBefore === 'number' ? p.scoreBefore : 50,
        scoreAfter: typeof p.scoreAfter === 'number' ? p.scoreAfter : 85,
        estimatedImprovement: typeof p.estimatedImprovement === 'number' ? p.estimatedImprovement : 35,
        issues: Array.isArray(p.issues) ? p.issues : []
      };
    } catch (err: any) {
      console.warn(`[OpenRouter] optimizeSQL failed: ${err.message} — using fallback`);
      return this.fallback.optimizeSQL(input);
    }
  }

  async analyzeSchema(input: AIAnalyzeSchemaInput): Promise<SchemaAnalysisResult> {
    try {
      const raw = await this.callOpenRouter(
        `You are a database architect. Analyze schema health, normalization, and indexing.
Return ONLY this JSON:
{"healthScore":78,"categories":[{"name":"Structure","score":80},{"name":"Indexing","score":70},{"name":"Naming","score":85},{"name":"Normalization","score":75},{"name":"Relationships","score":80},{"name":"Performance","score":72}],"issues":[{"severity":"critical"|"warning"|"info","table":"...","description":"...","suggestion":"...","autoFixable":false}]}`,
        `Schema:\n${this.formatSchema(input.schema)}`
      );
      const p = JSON.parse(raw);
      return {
        healthScore: typeof p.healthScore === 'number' ? p.healthScore : 78,
        categories: Array.isArray(p.categories) ? p.categories : [],
        issues: Array.isArray(p.issues) ? p.issues : []
      };
    } catch (err: any) {
      console.warn(`[OpenRouter] analyzeSchema failed: ${err.message} — using fallback`);
      return this.fallback.analyzeSchema(input);
    }
  }

  async suggestIndexes(input: { schema: SchemaContext }): Promise<{ suggestions: string[] }> {
    try {
      const raw = await this.callOpenRouter(
        `Suggest SQL index statements. Return ONLY:
{"suggestions":["CREATE INDEX idx_... ON table(col); -- reason"]}`,
        `Schema:\n${this.formatSchema(input.schema)}`
      );
      const p = JSON.parse(raw);
      return { suggestions: Array.isArray(p.suggestions) ? p.suggestions : [] };
    } catch {
      return this.fallback.suggestIndexes(input);
    }
  }
}
