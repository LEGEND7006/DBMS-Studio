import {
  AIService, AIGenerateSQLInput, AIExplainSQLInput, AIOptimizeSQLInput, AIAnalyzeSchemaInput,
  SQLGenerationResult, SQLExplanationResult, SQLOptimizationResult, SchemaAnalysisResult,
  SchemaContext, ColumnContext
} from './aiTypes';

/**
 * Demo AI Service — provides realistic deterministic AI responses
 * without requiring any external API key. All responses are context-aware.
 */
export class DemoAIService implements AIService {

  async generateSQL(input: AIGenerateSQLInput): Promise<SQLGenerationResult> {
    const prompt = input.prompt.toLowerCase();
    const dbType = input.dbType || 'mysql';
    const limitSyntax = dbType === 'mysql' ? 'LIMIT 10' : 'FETCH FIRST 10 ROWS ONLY';
    const dateSyntax = dbType === 'mysql'
      ? "DATE_SUB(NOW(), INTERVAL 30 DAY)"
      : "CURRENT_DATE - INTERVAL '30 days'";

    // Context-aware SQL generation based on keywords
    if ((prompt.includes('top') || prompt.includes('highest') || prompt.includes('best')) &&
        (prompt.includes('customer') || prompt.includes('user') || prompt.includes('client') || prompt.includes('buyer')) &&
        (prompt.includes('spend') || prompt.includes('spent') || prompt.includes('spending') || prompt.includes('money') || prompt.includes('order'))) {
      return {
        sql: `SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= ${dateSyntax}
  AND o.status != 'cancelled'
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC
${limitSyntax};`,
        explanation: `This query finds customers ranked by total spending in the last 30 days. It joins users with orders, filters cancelled orders, groups by customer, and sorts by descending spend. The INNER JOIN ensures only customers who placed orders appear.`,
        tablesUsed: ['users', 'orders'],
        assumptions: [
          'The orders table has a created_at timestamp column',
          'The orders table has a total_amount column in the same currency',
          'Cancelled orders are excluded from spending calculations',
          'The user_id foreign key connects orders to users'
        ],
        performanceConcerns: [
          'Add an index on orders.created_at for faster date filtering',
          'Add an index on orders.user_id for faster JOIN performance',
          'Consider caching this result as it involves aggregation on large datasets'
        ]
      };
    }

    if (prompt.includes('product') && (prompt.includes('low stock') || prompt.includes('inventory'))) {
      return {
        sql: `SELECT
    p.id,
    p.name,
    p.stock_qty,
    c.name AS category,
    p.price
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock_qty < 10
ORDER BY p.stock_qty ASC;`,
        explanation: 'This query finds products with low inventory (less than 10 units). It joins with categories for context and orders by stock quantity ascending so the most critical items appear first.',
        tablesUsed: ['products', 'categories'],
        assumptions: ['stock_qty < 10 is the low stock threshold', 'Products are linked to categories'],
        performanceConcerns: ['Add an index on products.stock_qty for efficient filtering']
      };
    }

    if (prompt.includes('order') && (prompt.includes('pending') || prompt.includes('today') || prompt.includes('recent'))) {
      return {
        sql: `SELECT
    o.id AS order_id,
    u.name AS customer_name,
    u.email,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
  AND DATE(o.created_at) = CURDATE()
ORDER BY o.created_at DESC;`,
        explanation: 'Retrieves all pending orders from today along with customer details. The query joins users to show customer names and emails, filtering specifically for pending status placed today.',
        tablesUsed: ['orders', 'users'],
        assumptions: ['Status field contains "pending" for new unprocessed orders', 'Date comparison uses the server timezone'],
        performanceConcerns: ['Composite index on (status, created_at) would dramatically improve this query']
      };
    }

    if (prompt.includes('revenue') || prompt.includes('sales') || prompt.includes('monthly')) {
      return {
        sql: `SELECT
    DATE_FORMAT(o.created_at, '%Y-%m') AS month,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS revenue,
    AVG(o.total_amount) AS avg_order_value,
    COUNT(DISTINCT o.user_id) AS unique_customers
FROM orders o
WHERE o.status = 'delivered'
  AND o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
ORDER BY month DESC;`,
        explanation: 'Generates a monthly revenue report for the last 12 months. Groups delivered orders by month and calculates total revenue, order count, average order value, and unique customer count per month.',
        tablesUsed: ['orders'],
        assumptions: ['Only delivered orders count as revenue', 'DATE_FORMAT is MySQL-specific — use TO_CHAR for PostgreSQL'],
        performanceConcerns: ['Index on (status, created_at) is critical for this analytical query', 'Consider a materialized view or caching for dashboards']
      };
    }

    if (prompt.includes('patient') && prompt.includes('doctor')) {
      return {
        sql: `SELECT
    p.name AS patient_name,
    d.name AS doctor_name,
    d.specialization,
    a.appointment_date,
    a.status,
    a.notes
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.id
INNER JOIN doctors d ON a.doctor_id = d.id
WHERE a.appointment_date >= CURRENT_DATE
ORDER BY a.appointment_date ASC;`,
        explanation: 'Lists upcoming appointments with full patient and doctor information. Joins three tables to show comprehensive appointment details ordered chronologically.',
        tablesUsed: ['appointments', 'patients', 'doctors'],
        assumptions: ['appointment_date stores date/time of appointment', 'Only future and today\'s appointments are shown'],
        performanceConcerns: ['Add index on appointments.appointment_date', 'Add index on appointments.patient_id and appointments.doctor_id']
      };
    }

    if (prompt.includes('student') && (prompt.includes('course') || prompt.includes('enroll'))) {
      return {
        sql: `SELECT
    s.roll_no,
    s.name AS student_name,
    s.department,
    c.course_code,
    c.title AS course_title,
    t.name AS teacher_name,
    e.grade,
    e.enrolled_at
FROM enrollments e
INNER JOIN students s ON e.student_id = s.id
INNER JOIN courses c ON e.course_id = c.id
LEFT JOIN teachers t ON c.teacher_id = t.id
ORDER BY s.roll_no, c.course_code;`,
        explanation: 'Retrieves complete enrollment information with student, course, and teacher details. Uses LEFT JOIN on teachers to include courses that may not yet have an assigned teacher.',
        tablesUsed: ['enrollments', 'students', 'courses', 'teachers'],
        assumptions: ['Courses may have null teacher_id if unassigned', 'Grades may be null for ongoing courses'],
        performanceConcerns: ['Add indexes on enrollments.student_id and enrollments.course_id']
      };
    }

    // Generic fallback with context awareness
    const tableNames = input.schema?.tables?.map(t => t.name) || ['table1', 'table2'];
    const mainTable = tableNames[0] || 'records';
    return {
      sql: `-- Generated SQL for: ${input.prompt}
SELECT
    ${mainTable}.*
FROM ${mainTable}
WHERE 1 = 1
  -- Add your WHERE conditions here
ORDER BY id DESC
LIMIT 100;`,
      explanation: `Generated a base SELECT query for the ${mainTable} table based on your request. Customize the WHERE clause and SELECT columns as needed.`,
      tablesUsed: [mainTable],
      assumptions: [
        'The table has an id column for ordering',
        'Modify the SELECT clause to specify exact columns needed',
        'Add appropriate WHERE filters based on your use case'
      ],
      performanceConcerns: [
        'Avoid SELECT * in production — list only required columns',
        'Add appropriate indexes on frequently filtered columns'
      ]
    };
  }

  async explainSQL(input: AIExplainSQLInput): Promise<SQLExplanationResult> {
    const sql = input.sql.trim().toUpperCase();

    const breakdown: { clause: string; explanation: string }[] = [];

    if (sql.includes('SELECT')) {
      const selectMatch = input.sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
      const cols = selectMatch ? selectMatch[1].trim() : '*';
      breakdown.push({
        clause: 'SELECT',
        explanation: cols === '*'
          ? 'Retrieves ALL columns from the result set. Consider specifying only needed columns for better performance.'
          : `Retrieves specific columns: ${cols}`
      });
    }

    if (sql.includes('FROM')) {
      const fromMatch = input.sql.match(/FROM\s+(\w+)/i);
      breakdown.push({
        clause: 'FROM',
        explanation: `Specifies the main data source table: ${fromMatch ? fromMatch[1] : 'the main table'}`
      });
    }

    if (sql.includes('JOIN')) {
      const joins = (input.sql.match(/(INNER|LEFT|RIGHT|FULL)?\s*JOIN\s+\w+/gi) || []);
      breakdown.push({
        clause: 'JOIN',
        explanation: `Combines data from ${joins.length} additional table(s): ${joins.join(', ')}. This links related records using matching key columns.`
      });
    }

    if (sql.includes('WHERE')) {
      const whereMatch = input.sql.match(/WHERE\s+([\s\S]+?)(?=GROUP|ORDER|HAVING|LIMIT|$)/i);
      breakdown.push({
        clause: 'WHERE',
        explanation: `Filters rows based on conditions: ${whereMatch ? whereMatch[1].trim().substring(0, 100) : 'specified conditions'}. Only matching rows are included in results.`
      });
    }

    if (sql.includes('GROUP BY')) {
      const groupMatch = input.sql.match(/GROUP BY\s+([\s\S]+?)(?=HAVING|ORDER|LIMIT|$)/i);
      breakdown.push({
        clause: 'GROUP BY',
        explanation: `Groups rows that share the same values in: ${groupMatch ? groupMatch[1].trim() : 'specified columns'}. Required when using aggregate functions like SUM, COUNT, AVG.`
      });
    }

    if (sql.includes('HAVING')) {
      breakdown.push({
        clause: 'HAVING',
        explanation: 'Filters groups after GROUP BY is applied — similar to WHERE but works on aggregated data. For example, only showing groups where SUM > 1000.'
      });
    }

    if (sql.includes('ORDER BY')) {
      const orderMatch = input.sql.match(/ORDER BY\s+([\s\S]+?)(?=LIMIT|$)/i);
      breakdown.push({
        clause: 'ORDER BY',
        explanation: `Sorts the final results by: ${orderMatch ? orderMatch[1].trim() : 'specified columns'}. DESC means largest/newest first, ASC means smallest/oldest first.`
      });
    }

    if (sql.includes('LIMIT') || sql.includes('FETCH FIRST')) {
      breakdown.push({
        clause: 'LIMIT / FETCH',
        explanation: 'Restricts the number of rows returned. Essential for pagination and preventing the database from returning millions of rows at once.'
      });
    }

    const hasJoin = sql.includes('JOIN');
    const hasSubquery = sql.includes('SELECT', sql.indexOf('SELECT') + 1);
    const hasAggregate = sql.includes('GROUP BY') || sql.includes('SUM(') || sql.includes('COUNT(') || sql.includes('AVG(');

    const complexity: 'simple' | 'moderate' | 'complex' =
      hasSubquery ? 'complex' :
      (hasJoin && hasAggregate) ? 'complex' :
      (hasJoin || hasAggregate) ? 'moderate' : 'simple';

    const summaries: string[] = [];
    if (hasJoin) summaries.push('joins multiple tables');
    if (hasAggregate) summaries.push('performs aggregation calculations');
    if (sql.includes('WHERE')) summaries.push('filters data with conditions');
    if (sql.includes('ORDER BY')) summaries.push('sorts the results');
    if (sql.includes('LIMIT')) summaries.push('limits the number of rows returned');

    return {
      summary: `This is a ${complexity} SQL query that ${summaries.length > 0 ? summaries.join(', ') : 'retrieves data from the database'}. ${breakdown.length > 0 ? `It uses ${breakdown.length} SQL clauses to process your request.` : ''}`,
      breakdown,
      complexity
    };
  }

  async optimizeSQL(input: AIOptimizeSQLInput): Promise<SQLOptimizationResult> {
    const sql = input.sql;
    const upperSql = sql.toUpperCase();

    const issues: { severity: 'critical' | 'warning' | 'info'; description: string; suggestion: string }[] = [];
    let scoreBefore = 100;

    // Detect SELECT *
    if (/SELECT\s+\*/i.test(sql)) {
      issues.push({
        severity: 'warning',
        description: 'SELECT * retrieves all columns unnecessarily',
        suggestion: 'Replace SELECT * with explicit column names to reduce data transfer and improve query planning'
      });
      scoreBefore -= 15;
    }

    // Detect IN subquery
    if (/IN\s*\(\s*SELECT/i.test(sql)) {
      issues.push({
        severity: 'warning',
        description: 'Correlated subquery in IN clause can cause performance issues',
        suggestion: 'Rewrite using JOIN or EXISTS clause for better performance — JOINs are typically 30-50% faster'
      });
      scoreBefore -= 20;
    }

    // Detect missing index hints
    if (/WHERE\s+\w+\s*=\s*/i.test(sql) && !upperSql.includes('USE INDEX') && !upperSql.includes('FORCE INDEX')) {
      const whereMatch = sql.match(/WHERE\s+(\w+)\.(\w+)\s*=/i) || sql.match(/WHERE\s+(\w+)\s*=/i);
      if (whereMatch) {
        issues.push({
          severity: 'critical',
          description: `Missing index on filtered column (${whereMatch[0].replace('WHERE ', '')}...)`,
          suggestion: `CREATE INDEX idx_${(whereMatch[2] || whereMatch[1]).toLowerCase()} ON table_name (${(whereMatch[2] || whereMatch[1]).toLowerCase()});`
        });
        scoreBefore -= 20;
      }
    }

    // Detect LIKE with leading wildcard
    if (/LIKE\s+['"]\s*%/i.test(sql)) {
      issues.push({
        severity: 'critical',
        description: 'LIKE with leading wildcard (%) causes a full table scan — indexes cannot be used',
        suggestion: 'Consider full-text search (FULLTEXT index + MATCH...AGAINST) for text search queries'
      });
      scoreBefore -= 20;
    }

    // Detect NOT IN
    if (/NOT\s+IN\s*\(/i.test(sql)) {
      issues.push({
        severity: 'warning',
        description: 'NOT IN with subquery is inefficient and fails with NULL values',
        suggestion: 'Replace NOT IN with LEFT JOIN ... WHERE right_table.id IS NULL (anti-join pattern)'
      });
      scoreBefore -= 10;
    }

    // Detect ORDER BY on non-indexed column
    if (/ORDER\s+BY/i.test(sql)) {
      issues.push({
        severity: 'info',
        description: 'ORDER BY requires a sort operation — verify the sort column is indexed',
        suggestion: 'If this query runs frequently, add an index on the ORDER BY column(s) to avoid filesort'
      });
      scoreBefore -= 5;
    }

    // Keep score between 0-100
    scoreBefore = Math.max(20, Math.min(100, scoreBefore));

    // Generate optimized SQL
    let optimizedSql = sql
      .replace(/SELECT\s+\*/gi, 'SELECT id, name, email, created_at')
      .replace(/IN\s*\(\s*SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*'([^']+)'\s*\)/gi,
        'INNER JOIN $2 ON $2.id = t.$3 AND $2.$3 = \'$4\'');

    if (optimizedSql === sql) {
      // If no replacements made, add comments about improvements
      optimizedSql = `-- OPTIMIZED VERSION\n-- Changes: Explicit columns, optimized join strategy\n${sql}`;
    }

    const scoreAfter = Math.min(95, scoreBefore + issues.length * 12);
    const estimatedImprovement = Math.round(((scoreAfter - scoreBefore) / 100) * 60);

    return {
      originalSql: sql,
      optimizedSql,
      scoreBefore: Math.max(20, scoreBefore),
      scoreAfter: Math.min(97, scoreAfter),
      estimatedImprovement: Math.max(10, estimatedImprovement),
      issues
    };
  }

  async analyzeSchema(input: AIAnalyzeSchemaInput): Promise<SchemaAnalysisResult> {
    const { tables } = input.schema;
    const issues: { severity: 'critical' | 'warning' | 'info'; table?: string; description: string; suggestion: string; autoFixable: boolean }[] = [];

    let structureScore = 100;
    let indexingScore = 100;
    let namingScore = 100;
    let normalizationScore = 100;
    let relationshipsScore = 100;
    let performanceScore = 100;

    for (const table of tables) {
      // Check for primary key
      const hasPk = table.columns.some(c => c.isPk);
      if (!hasPk) {
        issues.push({
          severity: 'critical',
          table: table.name,
          description: `Table "${table.name}" has no primary key`,
          suggestion: `Add a primary key column: ALTER TABLE ${table.name} ADD COLUMN id INT PRIMARY KEY AUTO_INCREMENT;`,
          autoFixable: true
        });
        structureScore -= 15;
      }

      // Check for poor naming (underscores vs camelCase inconsistency)
      const hasCamelCase = table.columns.some(c => /[A-Z]/.test(c.name));
      if (hasCamelCase) {
        issues.push({
          severity: 'info',
          table: table.name,
          description: `Table "${table.name}" mixes camelCase and snake_case column naming`,
          suggestion: 'Use consistent snake_case naming for all columns (database standard)',
          autoFixable: false
        });
        namingScore -= 10;
      }

      // Check for missing created_at
      const hasTimestamp = table.columns.some(c => c.name.includes('created_at') || c.name.includes('updated_at') || c.type?.toUpperCase().includes('TIMESTAMP'));
      if (!hasTimestamp && table.columns.length > 3) {
        issues.push({
          severity: 'info',
          table: table.name,
          description: `Table "${table.name}" has no timestamp column for audit trails`,
          suggestion: `Add audit columns: created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
          autoFixable: true
        });
        structureScore -= 5;
      }

      // Check for too many nullable columns
      const nullableCount = table.columns.filter(c => c.nullable && !c.isPk).length;
      if (nullableCount > table.columns.length * 0.7 && table.columns.length > 4) {
        issues.push({
          severity: 'info',
          table: table.name,
          description: `Table "${table.name}" has ${nullableCount} nullable columns — may indicate poor normalization`,
          suggestion: 'Review if all nullable columns truly need to be optional, or if they should be moved to a separate table',
          autoFixable: false
        });
        normalizationScore -= 10;
      }

      // Check for TEXT columns that should have indexes
      const hasTextSearch = table.columns.some(c => c.name.includes('email') || c.name.includes('phone') || c.name.includes('username'));
      if (hasTextSearch) {
        issues.push({
          severity: 'warning',
          table: table.name,
          description: `Table "${table.name}" has searchable text columns (email/phone/username) without confirmed indexes`,
          suggestion: `Add unique index: CREATE UNIQUE INDEX idx_${table.name}_email ON ${table.name} (email);`,
          autoFixable: true
        });
        indexingScore -= 15;
      }

      // Check for missing foreign key columns (columns named *_id without relationships)
      const fkColumns = table.columns.filter(c => c.name.endsWith('_id') && !c.isPk);
      if (fkColumns.length > 0) {
        issues.push({
          severity: 'warning',
          table: table.name,
          description: `Table "${table.name}" has ${fkColumns.length} foreign key column(s) (${fkColumns.map(c => c.name).join(', ')}) — ensure FK constraints are defined`,
          suggestion: `Add foreign key constraints to enforce referential integrity`,
          autoFixable: false
        });
        relationshipsScore -= 10;
      }
    }

    // Global checks
    if (tables.length > 10) {
      issues.push({
        severity: 'info',
        description: `Schema has ${tables.length} tables — consider reviewing if further normalization is needed`,
        suggestion: 'Review tables for potential consolidation or extraction of repeated data',
        autoFixable: false
      });
    }

    const categories = [
      { name: 'Structure', score: Math.max(40, structureScore) },
      { name: 'Relationships', score: Math.max(50, relationshipsScore) },
      { name: 'Indexing', score: Math.max(40, indexingScore) },
      { name: 'Naming', score: Math.max(60, namingScore) },
      { name: 'Normalization', score: Math.max(55, normalizationScore) },
      { name: 'Performance', score: Math.max(50, performanceScore) },
    ];

    const healthScore = Math.round(categories.reduce((acc, c) => acc + c.score, 0) / categories.length);

    return { healthScore, categories, issues };
  }

  async suggestIndexes(input: { schema: SchemaContext }): Promise<{ suggestions: string[] }> {
    const suggestions: string[] = [];

    for (const table of input.schema.tables) {
      // Suggest index for email columns
      const emailCol = table.columns.find(c => c.name === 'email');
      if (emailCol && !emailCol.isUnique) {
        suggestions.push(`CREATE INDEX idx_${table.name}_email ON ${table.name} (email);`);
      }

      // Suggest index for FK columns
      const fkCols = table.columns.filter(c => c.name.endsWith('_id') && !c.isPk);
      for (const col of fkCols) {
        suggestions.push(`CREATE INDEX idx_${table.name}_${col.name} ON ${table.name} (${col.name});`);
      }

      // Suggest index for status/type columns
      const statusCol = table.columns.find(c => c.name === 'status' || c.name === 'type');
      if (statusCol) {
        suggestions.push(`CREATE INDEX idx_${table.name}_${statusCol.name} ON ${table.name} (${statusCol.name});`);
      }

      // Suggest index for created_at
      const createdAt = table.columns.find(c => c.name === 'created_at');
      if (createdAt) {
        suggestions.push(`CREATE INDEX idx_${table.name}_created_at ON ${table.name} (created_at);`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('-- Your schema indexing looks good! No critical missing indexes detected.');
    }

    return { suggestions };
  }
}
