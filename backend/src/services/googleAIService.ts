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
 * Google AI Studio Service
 * 
 * Calls Google AI Studio REST API (generativelanguage.googleapis.com)
 * which hosts Gemma 4 and Gemini models.
 * 
 * Free API key: https://aistudio.google.com/app/apikey
 * 
 * Supported models:
 *   Gemma: gemma-3-27b-it, gemma-3-12b-it, gemma-3-4b-it, gemma-3-1b-it
 *   Gemini: gemini-2.0-flash, gemini-1.5-flash (also free)
 */
export class GoogleAIService implements AIService {
  private fallback = new DemoAIService();

  private async callGoogleAI(
    systemPrompt: string,
    userPrompt: string,
    configOverride?: Partial<AIConfig>
  ): Promise<string> {
    const config = { ...getAIConfig(), ...configOverride };
    const apiKey = config.googleApiKey;
    const model = config.googleModel || 'gemma-3-27b-it';

    if (!apiKey) throw new Error('Google AI Studio API key is not configured');

    // Google AI Studio uses generateContent endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: config.temperature ?? 0.2,
        responseMimeType: 'application/json',
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Google AI Studio API error ${res.status}: ${errText || res.statusText}`);
      }

      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      return this.extractJSON(text);
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  private extractJSON(raw: string): string {
    let s = raw.trim();
    // Strip markdown fences
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) s = fence[1].trim();
    // Extract JSON object
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last > first) s = s.substring(first, last + 1);
    return s;
  }

  async testConnection(configOverride?: Partial<AIConfig>): Promise<{
    success: boolean; latencyMs: number; model: string; message: string;
  }> {
    const config = { ...getAIConfig(), ...configOverride };
    const model = config.googleModel || 'gemma-3-27b-it';
    const start = Date.now();
    try {
      await this.callGoogleAI(
        'Return valid JSON only.',
        'Respond with: {"status":"ok"}',
        configOverride
      );
      return {
        success: true,
        latencyMs: Date.now() - start,
        model,
        message: `Connected to Google AI Studio (${model}) in ${Date.now() - start}ms.`
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        model,
        message: `Google AI Studio connection failed: ${err.message}`
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
      const raw = await this.callGoogleAI(
        `You are an expert ${dbType.toUpperCase()} database engineer. Generate optimized SQL.
Return ONLY this JSON (no extra text):
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
      console.warn(`[Google AI] generateSQL failed: ${err.message} — using fallback`);
      return this.fallback.generateSQL(input);
    }
  }

  async explainSQL(input: AIExplainSQLInput): Promise<SQLExplanationResult> {
    try {
      const raw = await this.callGoogleAI(
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
      console.warn(`[Google AI] explainSQL failed: ${err.message} — using fallback`);
      return this.fallback.explainSQL(input);
    }
  }

  async optimizeSQL(input: AIOptimizeSQLInput): Promise<SQLOptimizationResult> {
    try {
      const raw = await this.callGoogleAI(
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
      console.warn(`[Google AI] optimizeSQL failed: ${err.message} — using fallback`);
      return this.fallback.optimizeSQL(input);
    }
  }

  async analyzeSchema(input: AIAnalyzeSchemaInput): Promise<SchemaAnalysisResult> {
    try {
      const raw = await this.callGoogleAI(
        `You are a database architect. Analyze this schema for health, normalization, and indexing.
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
      console.warn(`[Google AI] analyzeSchema failed: ${err.message} — using fallback`);
      return this.fallback.analyzeSchema(input);
    }
  }

  async suggestIndexes(input: { schema: SchemaContext }): Promise<{ suggestions: string[] }> {
    try {
      const raw = await this.callGoogleAI(
        `Suggest SQL index statements for this schema. Return ONLY:
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
