export interface AIGenerateSQLInput {
  prompt: string;
  schema?: SchemaContext;
  dbType?: string;
}

export interface AIExplainSQLInput {
  sql: string;
}

export interface AIOptimizeSQLInput {
  sql: string;
  schema?: SchemaContext;
}

export interface AIAnalyzeSchemaInput {
  schema: SchemaContext;
}

export interface SchemaContext {
  tables: TableContext[];
  relationships?: RelationshipContext[];
  dbType?: string;
}

export interface TableContext {
  name: string;
  columns: ColumnContext[];
}

export interface ColumnContext {
  name: string;
  type: string;
  isPk?: boolean;
  isUnique?: boolean;
  nullable?: boolean;
}

export interface RelationshipContext {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: string;
}

export interface SQLGenerationResult {
  sql: string;
  explanation: string;
  tablesUsed: string[];
  assumptions: string[];
  performanceConcerns: string[];
}

export interface SQLExplanationResult {
  summary: string;
  breakdown: { clause: string; explanation: string }[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface SQLOptimizationResult {
  originalSql: string;
  optimizedSql: string;
  scoreBefore: number;
  scoreAfter: number;
  estimatedImprovement: number;
  issues: OptimizationIssue[];
}

export interface OptimizationIssue {
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestion: string;
}

export interface SchemaAnalysisResult {
  healthScore: number;
  categories: { name: string; score: number }[];
  issues: SchemaIssue[];
}

export interface SchemaIssue {
  severity: 'critical' | 'warning' | 'info';
  table?: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface AIService {
  generateSQL(input: AIGenerateSQLInput): Promise<SQLGenerationResult>;
  explainSQL(input: AIExplainSQLInput): Promise<SQLExplanationResult>;
  optimizeSQL(input: AIOptimizeSQLInput): Promise<SQLOptimizationResult>;
  analyzeSchema(input: AIAnalyzeSchemaInput): Promise<SchemaAnalysisResult>;
  suggestIndexes(input: { schema: SchemaContext }): Promise<{ suggestions: string[] }>;
}
