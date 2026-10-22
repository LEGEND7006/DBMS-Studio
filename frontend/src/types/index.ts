export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  db_type: DBType;
  created_at: string;
  updated_at: string;
  table_count?: number;
  query_count?: number;
}

export type DBType = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver' | 'oracle';

export interface DBTable {
  id: string;
  project_id: string;
  name: string;
  description: string;
  position_x: number;
  position_y: number;
  color?: string;
  columns: Column[];
  indexes?: TableIndex[];
  created_at: string;
}

export interface Column {
  id: string;
  table_id: string;
  name: string;
  data_type: string;
  nullable: number; // 0 or 1
  default_val: string | null;
  is_pk: number;
  is_unique: number;
  auto_increment: number;
  order_index: number;
}

export interface Relationship {
  id: string;
  project_id: string;
  source_table_id: string;
  source_column_id: string;
  target_table_id: string;
  target_column_id: string;
  rel_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  on_delete: string;
  on_update: string;
}

export interface TableIndex {
  id: string;
  table_id: string;
  name: string;
  columns_json: string;
  is_unique: number;
}

export interface Query {
  id: string;
  project_id: string | null;
  user_id: string;
  sql_text: string;
  status: 'success' | 'failed' | 'error';
  rows_returned: number;
  exec_time_ms: number;
  source: 'manual' | 'ai_generated' | 'sql_editor';
  error_message?: string | null;
  created_at: string;
  project_name?: string;
}

export interface QueryResult {
  queryId: string;
  columns: string[];
  rows: any[][];
  rowsAffected: number;
  executionTime: number;
  status: 'success' | 'error';
  error?: string;
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

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
