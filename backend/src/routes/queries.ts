import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { verifyProjectOwnership } from '../middleware/ownership';

const router = Router();
router.use(authMiddleware);

// POST execute a query (demo mode — simulates execution against sample data)
router.post('/execute', (req: AuthRequest, res: Response) => {
  try {
    const { sql, projectId } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL query is required' });

    if (projectId && !verifyProjectOwnership(projectId, req.userId!)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to execute queries in this project' });
    }

    // Security check — block destructive queries in demo
    const upperSql = sql.trim().toUpperCase();
    const destructive = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE DATABASE', 'DELETE FROM users WHERE 1', 'DELETE FROM projects'];
    for (const pattern of destructive) {
      if (upperSql.includes(pattern)) {
        return res.status(403).json({ error: 'Destructive queries are not allowed in demo mode' });
      }
    }

    // Simulate execution with realistic demo data
    const startTime = Date.now();
    const result = simulateQuery(sql);
    const execTime = (Date.now() - startTime) + Math.random() * 50;

    // Save to history
    const queryId = uuidv4();
    db.prepare(`
      INSERT INTO queries (id, project_id, user_id, sql_text, status, rows_returned, exec_time_ms, source)
      VALUES (?, ?, ?, ?, 'success', ?, ?, 'sql_editor')
    `).run(queryId, projectId || null, req.userId, sql, result.rows.length, execTime.toFixed(2));

    res.json({
      queryId,
      columns: result.columns,
      rows: result.rows,
      rowsAffected: result.rows.length,
      executionTime: parseFloat(execTime.toFixed(2)),
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ error: 'Query execution failed' });
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
