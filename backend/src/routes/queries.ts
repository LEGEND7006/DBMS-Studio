import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

export interface SyntaxValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Pre-execution SQL syntax validator
 * Detects common syntax errors including unbalanced quotes, unbalanced parentheses,
 * empty SELECT clauses, and invalid keyword ordering.
 */
export function validateSqlSyntax(rawSql: string): SyntaxValidationResult {
  const sql = rawSql.trim();
  if (!sql) {
    return { valid: false, error: 'Empty SQL query provided' };
  }

  // 1. Unbalanced quotes & parentheses checking
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDoubleQuote && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') {
        parenDepth++;
      } else if (ch === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          return { valid: false, error: `Syntax error: unexpected closing parenthesis ')' at position ${i + 1}` };
        }
      }
    }
  }

  if (inSingleQuote) {
    return { valid: false, error: 'Syntax error: unclosed single quotation mark in query literal' };
  }
  if (inDoubleQuote) {
    return { valid: false, error: 'Syntax error: unclosed double quotation mark in identifier' };
  }
  if (parenDepth > 0) {
    return { valid: false, error: `Syntax error: ${parenDepth} unclosed parenthesis '(' detected` };
  }

  // 2. Structural & keyword checks
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  const upper = cleanSql.toUpperCase();
  const firstWord = upper.split(/\s+/)[0];

  const validVerbs = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
    'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH', 'USE', 'PRAGMA', 'BEGIN', 'COMMIT', 'ROLLBACK'
  ];

  if (!validVerbs.includes(firstWord)) {
    return {
      valid: false,
      error: `Syntax error: Unrecognized statement verb '${firstWord}'. Query must start with a valid SQL keyword.`
    };
  }

  if (firstWord === 'SELECT') {
    if (/^SELECT\s+FROM\b/i.test(cleanSql)) {
      return { valid: false, error: "Syntax error: Missing column expressions or '*' between SELECT and FROM" };
    }
    if (/^SELECT\s+WHERE\b/i.test(cleanSql)) {
      return { valid: false, error: "Syntax error: SELECT query cannot specify a WHERE clause without a FROM table clause" };
    }
    if (/,\s*FROM\b/i.test(cleanSql)) {
      return { valid: false, error: "Syntax error: Trailing comma in column projection list before 'FROM'" };
    }
    if (/,\s*WHERE\b/i.test(cleanSql)) {
      return { valid: false, error: "Syntax error: Trailing comma before 'WHERE' clause" };
    }
  }

  return { valid: true };
}

// POST execute a query (with full syntax validation and audit trail)
router.post('/execute', (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  const { sql, projectId } = req.body;

  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const queryId = uuidv4();
  const trimmedSql = sql.trim();
  const upperSql = trimmedSql.toUpperCase();

  // 1. Security check — block destructive commands in safety mode
  const destructivePatterns = [
    'DROP DATABASE', 'DROP TABLE', 'TRUNCATE DATABASE', 'TRUNCATE TABLE',
    'DELETE FROM USERS WHERE 1', 'DELETE FROM PROJECTS'
  ];

  for (const pattern of destructivePatterns) {
    if (upperSql.includes(pattern)) {
      const execTime = Date.now() - startTime;
      const errorMsg = `Destructive query blocked: '${pattern}' is not permitted in safety mode`;

      try {
        db.prepare(`
          INSERT INTO queries (id, project_id, user_id, sql_text, status, error_message, rows_returned, exec_time_ms, source)
          VALUES (?, ?, ?, ?, 'failed', ?, 0, ?, 'sql_editor')
        `).run(queryId, projectId || null, req.userId, trimmedSql, errorMsg, parseFloat(execTime.toFixed(2)));
      } catch (err) {
        console.error('Failed to record blocked query in history:', err);
      }

      return res.status(403).json({
        queryId,
        error: errorMsg,
        status: 'error',
        executionTime: parseFloat(execTime.toFixed(2))
      });
    }
  }

  // 2. Syntax validation
  const validation = validateSqlSyntax(trimmedSql);
  if (!validation.valid) {
    const execTime = (Date.now() - startTime) + Math.random() * 8;
    const errorMsg = validation.error || 'SQL syntax error';

    try {
      db.prepare(`
        INSERT INTO queries (id, project_id, user_id, sql_text, status, error_message, rows_returned, exec_time_ms, source)
        VALUES (?, ?, ?, ?, 'failed', ?, 0, ?, 'sql_editor')
      `).run(queryId, projectId || null, req.userId, trimmedSql, errorMsg, parseFloat(execTime.toFixed(2)));
    } catch (err) {
      console.error('Failed to record syntax error query in history:', err);
    }

    return res.status(400).json({
      queryId,
      error: errorMsg,
      status: 'error',
      executionTime: parseFloat(execTime.toFixed(2))
    });
  }

  // 3. Execution Simulation
  try {
    const result = simulateQuery(trimmedSql);
    const execTime = (Date.now() - startTime) + Math.random() * 40;

    db.prepare(`
      INSERT INTO queries (id, project_id, user_id, sql_text, status, error_message, rows_returned, exec_time_ms, source)
      VALUES (?, ?, ?, ?, 'success', NULL, ?, ?, 'sql_editor')
    `).run(queryId, projectId || null, req.userId, trimmedSql, result.rows.length, parseFloat(execTime.toFixed(2)));

    res.json({
      queryId,
      columns: result.columns,
      rows: result.rows,
      rowsAffected: result.rows.length,
      executionTime: parseFloat(execTime.toFixed(2)),
      status: 'success'
    });
  } catch (err: any) {
    const execTime = Date.now() - startTime;
    const errorMsg = err?.message || 'Query execution failed';

    try {
      db.prepare(`
        INSERT INTO queries (id, project_id, user_id, sql_text, status, error_message, rows_returned, exec_time_ms, source)
        VALUES (?, ?, ?, ?, 'failed', ?, 0, ?, 'sql_editor')
      `).run(queryId, projectId || null, req.userId, trimmedSql, errorMsg, parseFloat(execTime.toFixed(2)));
    } catch (e) {
      console.error('Failed to record failed query in history:', e);
    }

    res.status(500).json({
      queryId,
      error: errorMsg,
      status: 'error',
      executionTime: parseFloat(execTime.toFixed(2))
    });
  }
});

function simulateQuery(sql: string): { columns: string[]; rows: any[][] } {
  const upper = sql.trim().toUpperCase();

  if (!upper.startsWith('SELECT')) {
    return { columns: ['message'], rows: [['Query executed successfully (simulated)']] };
  }

  // E-commerce demo data
  if (upper.includes('USER') && upper.includes('ORDER')) {
    return {
      columns: ['id', 'customer_name', 'email', 'total_orders', 'total_spent'],
      rows: [
        [102, 'Rahul Sharma', 'rahul@example.com', 8, '₹42,500'],
        [87, 'Priya Singh', 'priya@example.com', 6, '₹38,200'],
        [41, 'Aman Verma', 'aman@example.com', 11, '₹31,750'],
        [215, 'Neha Gupta', 'neha@example.com', 4, '₹28,900'],
        [73, 'Vikram Patel', 'vikram@example.com', 9, '₹25,400'],
        [189, 'Sneha Reddy', 'sneha@example.com', 3, '₹21,800'],
        [54, 'Arjun Kumar', 'arjun@example.com', 7, '₹19,200'],
        [301, 'Kavya Nair', 'kavya@example.com', 5, '₹17,500'],
        [67, 'Rohit Mishra', 'rohit@example.com', 2, '₹14,300'],
        [142, 'Divya Joshi', 'divya@example.com', 6, '₹12,750'],
      ]
    };
  }

  if (upper.includes('PRODUCT')) {
    return {
      columns: ['id', 'name', 'category', 'price', 'stock_qty'],
      rows: [
        [1, 'iPhone 15 Pro', 'Electronics', '₹1,29,900', 45],
        [2, 'Samsung Galaxy S24', 'Electronics', '₹89,999', 32],
        [3, 'Nike Air Max', 'Footwear', '₹8,995', 120],
        [4, 'Levi\'s 501 Jeans', 'Clothing', '₹3,499', 78],
        [5, 'Sony WH-1000XM5', 'Electronics', '₹29,990', 23],
        [6, 'Adidas Ultraboost', 'Footwear', '₹12,999', 56],
        [7, 'MacBook Air M2', 'Electronics', '₹1,14,900', 18],
        [8, 'Cotton T-Shirt', 'Clothing', '₹599', 250],
      ]
    };
  }

  if (upper.includes('ORDER') && upper.includes('PENDING')) {
    return {
      columns: ['order_id', 'customer_name', 'total_amount', 'status', 'created_at'],
      rows: [
        [1045, 'Rahul Sharma', '₹12,499', 'pending', '2026-09-02 09:30:00'],
        [1046, 'Priya Singh', '₹3,299', 'pending', '2026-09-02 09:45:00'],
        [1047, 'Aman Verma', '₹89,999', 'pending', '2026-09-02 10:00:00'],
      ]
    };
  }

  if (upper.includes('PATIENT') || upper.includes('DOCTOR') || upper.includes('APPOINTMENT')) {
    return {
      columns: ['patient_name', 'doctor_name', 'specialization', 'appointment_date', 'status'],
      rows: [
        ['Ramesh Gupta', 'Dr. Anika Sharma', 'Cardiology', '2026-09-02 11:00', 'scheduled'],
        ['Sunita Verma', 'Dr. Raj Kumar', 'Orthopedics', '2026-09-02 14:30', 'scheduled'],
        ['Mohan Das', 'Dr. Priya Singh', 'Neurology', '2026-09-02 16:00', 'confirmed'],
      ]
    };
  }

  if (upper.includes('STUDENT') || upper.includes('ENROLL') || upper.includes('COURSE')) {
    return {
      columns: ['roll_no', 'student_name', 'course_code', 'course_title', 'grade'],
      rows: [
        ['CS2024001', 'Aryan Kapoor', 'CS401', 'Database Management', 'A'],
        ['CS2024002', 'Sakshi Agarwal', 'CS401', 'Database Management', 'B+'],
        ['CS2024003', 'Tanuj Mehra', 'CS301', 'Data Structures', 'A+'],
        ['CS2024001', 'Aryan Kapoor', 'CS301', 'Data Structures', 'A'],
      ]
    };
  }

  // Generic SELECT response
  return {
    columns: ['id', 'name', 'status', 'created_at'],
    rows: [
      [1, 'Sample Record 1', 'active', '2026-09-01 10:00:00'],
      [2, 'Sample Record 2', 'active', '2026-09-01 11:00:00'],
      [3, 'Sample Record 3', 'inactive', '2026-09-01 12:00:00'],
    ]
  };
}

// GET query history
router.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || '';
    const projectId = req.query.projectId as string;
    const status = req.query.status as string;

    let query = `
      SELECT q.*, p.name as project_name 
      FROM queries q
      LEFT JOIN projects p ON q.project_id = p.id
      WHERE q.user_id = ?
    `;
    const params: any[] = [req.userId];

    if (search) {
      query += ` AND q.sql_text LIKE ?`;
      params.push(`%${search}%`);
    }
    if (projectId) {
      query += ` AND q.project_id = ?`;
      params.push(projectId);
    }
    if (status && status !== 'all') {
      query += ` AND q.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY q.created_at DESC LIMIT ?`;
    params.push(limit);

    const queries = db.prepare(query).all(...params);
    res.json({ queries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch query history' });
  }
});

// DELETE a query from history
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM queries WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete query' });
  }
});

export default router;
