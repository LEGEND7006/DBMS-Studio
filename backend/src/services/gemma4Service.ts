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

export class Gemma4AIService implements AIService {
  private fallbackService = new DemoAIService();

  /**
   * Universal Gemma 4 LLM Caller
   * Supports Ollama native (/api/chat), Ollama OpenAI API (/v1/chat/completions),
   * OpenRouter, vLLM, and Cloud endpoints.
   */
  private async callGemma4(systemPrompt: string, userPrompt: string, configOverride?: Partial<AIConfig>): Promise<string> {
    const config = { ...getAIConfig(), ...configOverride };
    let endpoint = (config.gemmaEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
    // Normalize localhost to 127.0.0.1 for faster local socket connect on Windows
    if (endpoint.includes('localhost:11434')) {
      endpoint = endpoint.replace('localhost:11434', '127.0.0.1:11434');
    }
    const model = config.gemmaModel || 'gemma4:31b';
    const apiKey = config.gemmaApiKey || '';

    // Decide URL and payload format based on endpoint
    const isOllamaHost = endpoint.includes('11434') || !endpoint.includes('/v1');
    const targetUrl = isOllamaHost
      ? (endpoint.endsWith('/api/chat') ? endpoint : `${endpoint}/api/chat`)
      : (endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = isOllamaHost
      ? {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          format: 'json',
          options: {
            temperature: config.temperature ?? 0.2
          }
        }
      : {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: config.temperature ?? 0.2,
          response_format: { type: 'json_object' }
        };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Gemma 4 HTTP ${response.status} from ${targetUrl}: ${errorText || response.statusText}`);
      }

      const data: any = await response.json();

      let textOutput = '';
      if (data?.message?.content) {
        textOutput = data.message.content;
      } else if (data?.choices?.[0]?.message?.content) {
        textOutput = data.choices[0].message.content;
      } else if (data?.response) {
        textOutput = data.response;
      } else {
        textOutput = JSON.stringify(data);
      }

      return this.cleanGemmaOutput(textOutput);
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Cleans Gemma 4 reasoning / thought tokens and extracts pure JSON
   */
  private cleanGemmaOutput(raw: string): string {
    let cleaned = raw.trim();

    // Strip Gemma 4 thinking / reasoning blocks (e.g. <thought>...</thought> or <think>...</think>)
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip markdown code block wrappers ```json ... ``` or ``` ... ```
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // If still surrounded by extraneous text, extract between first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  /**
   * Connection tester for Settings and Diagnostics
   */
  async testConnection(configOverride?: Partial<AIConfig>): Promise<{
    success: boolean;
    latencyMs: number;
    model: string;
    endpoint: string;
    message: string;
  }> {
    const config = { ...getAIConfig(), ...configOverride };
    const startTime = Date.now();
    let endpoint = (config.gemmaEndpoint || 'http://localhost:11434').trim();
    if (endpoint.includes('localhost:11434')) {
      endpoint = endpoint.replace('localhost:11434', '127.0.0.1:11434');
    }
    const model = config.gemmaModel || 'gemma4:31b';

    try {
      // First attempt quick tags ping for Ollama
      if (endpoint.includes('11434')) {
        const pingUrl = endpoint.replace(/\/+$/, '') + '/api/tags';
        const res = await fetch(pingUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data: any = await res.json();
          const latencyMs = Date.now() - startTime;
          const modelsAvailable = (data.models || []).map((m: any) => m.name);
          const hasRequestedModel = modelsAvailable.some((m: string) => m.toLowerCase().includes(model.toLowerCase()));

          return {
            success: true,
            latencyMs,
            model,
            endpoint,
            message: hasRequestedModel
              ? `Connected to local Ollama. Model "${model}" is ready and verified.`
              : `Connected to local Ollama (${latencyMs}ms). Note: "${model}" is not yet pulled. Run "ollama run ${model}" in terminal.`
          };
        }
      }

      // Universal ping test with tiny prompt
      const testJson = await this.callGemma4(
        'You are Gemma 4. Return valid JSON only.',
        'Respond with: {"status": "ok", "model": "gemma4"}',
        configOverride
      );

      const latencyMs = Date.now() - startTime;
      JSON.parse(testJson);

      return {
        success: true,
        latencyMs,
        model,
        endpoint,
        message: `Successfully connected to Gemma 4 inference server (${latencyMs}ms).`
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        model,
        endpoint,
        message: `Connection failed: ${err.message}. (Using intelligent offline simulation fallback).`
      };
    }
  }

  private formatSchemaContext(schema?: SchemaContext): string {
    if (!schema || !schema.tables || schema.tables.length === 0) {
      return 'No active schema loaded.';
    }

    let text = `Database Type: ${schema.dbType || 'mysql'}\nTables:\n`;
    for (const table of schema.tables) {
      text += `\nTable "${table.name}":\n`;
      for (const col of table.columns) {
        const flags = [];
        if (col.isPk) flags.push('PRIMARY KEY');
        if (col.isUnique) flags.push('UNIQUE');
        if (!col.nullable) flags.push('NOT NULL');
        text += `  - ${col.name} ${col.type} ${flags.join(' ')}\n`;
      }
    }

    if (schema.relationships && schema.relationships.length > 0) {
      text += `\nForeign Key Relationships:\n`;
      for (const rel of schema.relationships) {
        text += `  - ${rel.sourceTable}.${rel.sourceColumn} -> ${rel.targetTable}.${rel.targetColumn} (${rel.type})\n`;
      }
    }

    return text;
  }

  async generateSQL(input: AIGenerateSQLInput): Promise<SQLGenerationResult> {
    const config = getAIConfig();
    const dbType = input.dbType || input.schema?.dbType || 'mysql';
    const schemaDesc = this.formatSchemaContext(input.schema);

    const systemPrompt = `You are Google DeepMind's Gemma 4, an open-weight multimodal and reasoning database intelligence model.
Your task is to generate highly optimized, syntactically correct SQL for ${dbType.toUpperCase()} based on user natural language requirements and the provided schema.

Strictly return a JSON object with this exact shape:
{
  "sql": "formatted SQL query string",
  "explanation": "concise technical explanation of the query and join strategy",
  "tablesUsed": ["list", "of", "tables"],
  "assumptions": ["assumption 1", "assumption 2"],
  "performanceConcerns": ["index suggestion or execution consideration"]
}
Do not wrap with conversational filler. Output strictly valid JSON.`;

    const userPrompt = `Database Schema Context:
${schemaDesc}

User Request:
"${input.prompt}"

Generate the optimal ${dbType} SQL query now.`;

    try {
      const raw = await this.callGemma4(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw);

      return {
        sql: parsed.sql || '-- Gemma 4 could not construct valid SQL\nSELECT 1;',
        explanation: parsed.explanation || 'SQL query generated by Gemma 4.',
        tablesUsed: Array.isArray(parsed.tablesUsed) ? parsed.tablesUsed : [],
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
        performanceConcerns: Array.isArray(parsed.performanceConcerns) ? parsed.performanceConcerns : []
      };
    } catch (err: any) {
      console.warn(`[Gemma 4 Service] Live inference failed (${err.message}). Using fallback engine.`);
      const fallback = await this.fallbackService.generateSQL(input);
      fallback.assumptions.unshift(`[Gemma 4 Engine: Offline Simulation] Run "ollama run ${config.gemmaModel}" for live weights.`);
      return fallback;
    }
  }

  async explainSQL(input: AIExplainSQLInput): Promise<SQLExplanationResult> {
    const systemPrompt = `You are Google Gemma 4 SQL Analyzer.
Analyze the provided SQL query and explain its semantics, execution clauses, and overall algorithmic complexity.

Strictly return a JSON object with this exact shape:
{
  "summary": "Overall plain-English explanation of what the query achieves",
  "complexity": "simple" | "moderate" | "complex",
  "breakdown": [
    { "clause": "SELECT / FROM / JOIN / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT", "explanation": "Detailed explanation of what this clause does" }
  ]
}
Output strictly valid JSON.`;

    const userPrompt = `Query to explain:\n\n${input.sql}`;

    try {
      const raw = await this.callGemma4(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw);
      return {
        summary: parsed.summary || 'SQL query breakdown generated by Gemma 4.',
        complexity: (['simple', 'moderate', 'complex'].includes(parsed.complexity) ? parsed.complexity : 'moderate') as any,
        breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : []
      };
    } catch (err: any) {
      console.warn(`[Gemma 4 Service] Explain failed (${err.message}). Using fallback.`);
      return this.fallbackService.explainSQL(input);
    }
  }

  async optimizeSQL(input: AIOptimizeSQLInput): Promise<SQLOptimizationResult> {
    const config = getAIConfig();
    const schemaDesc = this.formatSchemaContext(input.schema);

    const systemPrompt = `You are Google Gemma 4 Query Performance Optimizer.
Inspect the user SQL query for anti-patterns:
- Full table scans, missing WHERE index filters
- Correlated subqueries that can be converted to JOINs
- SELECT * over-fetching
- Unindexed foreign key lookups
- Non-SARGable WHERE predicates (e.g. functions wrapping column names)

Rewrite the SQL for maximum execution speed, score efficiency before & after (0-100), and list actionable performance issues.

Strictly return a JSON object with this exact shape:
{
  "originalSql": "unmodified input SQL",
  "optimizedSql": "optimized rewritten SQL query",
  "scoreBefore": number (e.g. 45),
  "scoreAfter": number (e.g. 88),
  "estimatedImprovement": number (e.g. 45 for 45% faster),
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "description": "Specific issue identified",
      "suggestion": "How it was fixed"
    }
  ]
}
Output strictly valid JSON.`;

    const userPrompt = `Database Context:\n${schemaDesc}\n\nSQL to Optimize:\n${input.sql}`;

    try {
      const raw = await this.callGemma4(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw);
      return {
        originalSql: input.sql,
        optimizedSql: parsed.optimizedSql || input.sql,
        scoreBefore: typeof parsed.scoreBefore === 'number' ? parsed.scoreBefore : 50,
        scoreAfter: typeof parsed.scoreAfter === 'number' ? parsed.scoreAfter : 85,
        estimatedImprovement: typeof parsed.estimatedImprovement === 'number' ? parsed.estimatedImprovement : 35,
        issues: Array.isArray(parsed.issues) ? parsed.issues : []
      };
    } catch (err: any) {
      console.warn(`[Gemma 4 Service] Optimize failed (${err.message}). Using fallback.`);
      return this.fallbackService.optimizeSQL(input);
    }
  }

  async analyzeSchema(input: AIAnalyzeSchemaInput): Promise<SchemaAnalysisResult> {
    const schemaDesc = this.formatSchemaContext(input.schema);

    const systemPrompt = `You are Google Gemma 4 Database Architect.
Perform a comprehensive schema health and architecture review:
1. Normalization & 3NF integrity
2. Indexing and Primary Key hygiene
3. Foreign key constraints & orphan record prevention
4. Data type sizing and nullability sanity
5. Consistent naming conventions

Strictly return a JSON object with this exact shape:
{
  "healthScore": number (0 to 100),
  "categories": [
    { "name": "Structure", "score": number },
    { "name": "Indexing", "score": number },
    { "name": "Naming", "score": number },
    { "name": "Normalization", "score": number },
    { "name": "Relationships", "score": number },
    { "name": "Performance", "score": number }
  ],
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "table": "affected_table_name",
      "description": "Clear explanation of architectural issue",
      "suggestion": "Specific recommendation or DDL fix",
      "autoFixable": boolean
    }
  ]
}
Output strictly valid JSON.`;

    const userPrompt = `Analyze this schema structure:\n\n${schemaDesc}`;

    try {
      const raw = await this.callGemma4(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw);
      return {
        healthScore: typeof parsed.healthScore === 'number' ? parsed.healthScore : 78,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues : []
      };
    } catch (err: any) {
      console.warn(`[Gemma 4 Service] Schema analysis failed (${err.message}). Using fallback.`);
      return this.fallbackService.analyzeSchema(input);
    }
  }

  async suggestIndexes(input: { schema: SchemaContext }): Promise<{ suggestions: string[] }> {
    const schemaDesc = this.formatSchemaContext(input.schema);

    const systemPrompt = `You are Google Gemma 4 Indexing Engine.
Recommend targeted B-Tree or composite indexes for this database schema to accelerate queries and JOINs.

Strictly return a JSON object with this exact shape:
{
  "suggestions": [
    "CREATE INDEX idx_name ON table_name(col1, col2); -- Reason for index",
    "..."
  ]
}
Output strictly valid JSON.`;

    const userPrompt = `Suggest indexes for:\n\n${schemaDesc}`;

    try {
      const raw = await this.callGemma4(systemPrompt, userPrompt);
      const parsed = JSON.parse(raw);
      return {
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
    } catch (err: any) {
      return this.fallbackService.suggestIndexes(input);
    }
  }
}
