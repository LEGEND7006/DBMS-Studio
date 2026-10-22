import { db } from './database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function seedDemoData(): Promise<void> {
  // Check if already seeded
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@dbmsstudio.com');
  if (existingUser) {
    console.log('✅ Demo data already seeded');
    return;
  }

  console.log('🌱 Seeding demo data...');

  // Create demo user
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('demo1234', 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)
  `).run(userId, 'demo@dbmsstudio.com', passwordHash, 'Demo User');

  // ==================== E-COMMERCE PROJECT ====================
  const ecomId = uuidv4();
  db.prepare(`INSERT INTO projects (id, user_id, name, description, db_type) VALUES (?, ?, ?, ?, ?)`).run(
    ecomId, userId, 'E-Commerce Database', 'Full e-commerce platform with orders, products, users and payments', 'mysql'
  );

  // Tables for e-commerce
  const usersTableId = uuidv4();
  const productsTableId = uuidv4();
  const categoriesTableId = uuidv4();
  const ordersTableId = uuidv4();
  const orderItemsTableId = uuidv4();
  const paymentsTableId = uuidv4();

  const ecomTables = [
    { id: usersTableId, name: 'users', x: 50, y: 50 },
    { id: categoriesTableId, name: 'categories', x: 500, y: 50 },
    { id: productsTableId, name: 'products', x: 500, y: 280 },
    { id: ordersTableId, name: 'orders', x: 50, y: 320 },
    { id: orderItemsTableId, name: 'order_items', x: 280, y: 500 },
    { id: paymentsTableId, name: 'payments', x: 50, y: 580 },
  ];

  for (const t of ecomTables) {
    db.prepare(`INSERT INTO db_tables (id, project_id, name, position_x, position_y) VALUES (?, ?, ?, ?, ?)`).run(
      t.id, ecomId, t.name, t.x, t.y
    );
  }

  // Columns for each table
  const ecomColumns = [
    // users
    { tid: usersTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: usersTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: usersTableId, name: 'email', type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 2 },
    { tid: usersTableId, name: 'password', type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: usersTableId, name: 'phone', type: 'VARCHAR(20)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: usersTableId, name: 'created_at', type: 'TIMESTAMP', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: 'CURRENT_TIMESTAMP', order_index: 5 },
    // categories
    { tid: categoriesTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: categoriesTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: categoriesTableId, name: 'slug', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 2 },
    { tid: categoriesTableId, name: 'parent_id', type: 'INT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    // products
    { tid: productsTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: productsTableId, name: 'category_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: productsTableId, name: 'name', type: 'VARCHAR(200)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: productsTableId, name: 'description', type: 'TEXT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: productsTableId, name: 'price', type: 'DECIMAL(10,2)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: productsTableId, name: 'stock_qty', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: '0', order_index: 5 },
    { tid: productsTableId, name: 'image_url', type: 'TEXT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 6 },
    // orders
    { tid: ordersTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: ordersTableId, name: 'user_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: ordersTableId, name: 'status', type: "ENUM('pending','processing','shipped','delivered','cancelled')", nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: "'pending'", order_index: 2 },
    { tid: ordersTableId, name: 'total_amount', type: 'DECIMAL(12,2)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: ordersTableId, name: 'shipping_address', type: 'TEXT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: ordersTableId, name: 'created_at', type: 'TIMESTAMP', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: 'CURRENT_TIMESTAMP', order_index: 5 },
    // order_items
    { tid: orderItemsTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: orderItemsTableId, name: 'order_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: orderItemsTableId, name: 'product_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: orderItemsTableId, name: 'quantity', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: orderItemsTableId, name: 'unit_price', type: 'DECIMAL(10,2)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    // payments
    { tid: paymentsTableId, name: 'id', type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: paymentsTableId, name: 'order_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: paymentsTableId, name: 'amount', type: 'DECIMAL(12,2)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: paymentsTableId, name: 'method', type: "ENUM('upi','card','netbanking','cod')", nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: paymentsTableId, name: 'status', type: "ENUM('pending','success','failed','refunded')", nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: "'pending'", order_index: 4 },
    { tid: paymentsTableId, name: 'transaction_id', type: 'VARCHAR(100)', nullable: 1, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 5 },
    { tid: paymentsTableId, name: 'paid_at', type: 'TIMESTAMP', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 6 },
  ];

  const insertCol = db.prepare(`
    INSERT INTO columns (id, table_id, name, data_type, nullable, default_val, is_pk, is_unique, auto_increment, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const col of ecomColumns) {
    insertCol.run(uuidv4(), col.tid, col.name, col.type, col.nullable, (col as any).default_val || null, col.is_pk, col.is_unique, col.auto_increment, col.order_index);
  }

  // Sample queries
  const sampleQueries = [
    { sql: 'SELECT c.name, SUM(o.total_amount) AS total_spent FROM users c JOIN orders o ON c.id = o.user_id GROUP BY c.id ORDER BY total_spent DESC LIMIT 10', status: 'success', rows: 10, time: 45.2 },
    { sql: 'SELECT * FROM orders WHERE status = \'pending\' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)', status: 'success', rows: 23, time: 12.8 },
    { sql: 'SELECT p.name, SUM(oi.quantity) AS total_sold FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id ORDER BY total_sold DESC', status: 'success', rows: 50, time: 156.4 },
    { sql: 'SELECT * FROM products WHERE category_id IN (SELECT id FROM categories WHERE parent_id IS NULL)', status: 'success', rows: 34, time: 284.7 },
  ];

  for (const q of sampleQueries) {
    db.prepare(`INSERT INTO queries (id, project_id, user_id, sql_text, status, rows_returned, exec_time_ms, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), ecomId, userId, q.sql, q.status, q.rows, q.time, 'manual'
    );
  }

  // ==================== HOSPITAL PROJECT ====================
  const hospitalId = uuidv4();
  db.prepare(`INSERT INTO projects (id, user_id, name, description, db_type) VALUES (?, ?, ?, ?, ?)`).run(
    hospitalId, userId, 'Hospital Management System', 'Patient, doctor, appointment and prescription management', 'postgresql'
  );

  const patientsTableId = uuidv4();
  const doctorsTableId = uuidv4();
  const appointmentsTableId = uuidv4();
  const prescriptionsTableId = uuidv4();

  const hospitalTables = [
    { id: patientsTableId, name: 'patients', x: 50, y: 50 },
    { id: doctorsTableId, name: 'doctors', x: 400, y: 50 },
    { id: appointmentsTableId, name: 'appointments', x: 200, y: 280 },
    { id: prescriptionsTableId, name: 'prescriptions', x: 200, y: 500 },
  ];

  for (const t of hospitalTables) {
    db.prepare(`INSERT INTO db_tables (id, project_id, name, position_x, position_y) VALUES (?, ?, ?, ?, ?)`).run(
      t.id, hospitalId, t.name, t.x, t.y
    );
  }

  const hospitalColumns = [
    { tid: patientsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: patientsTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: patientsTableId, name: 'dob', type: 'DATE', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: patientsTableId, name: 'gender', type: "VARCHAR(10)", nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: patientsTableId, name: 'phone', type: 'VARCHAR(20)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: patientsTableId, name: 'blood_group', type: 'VARCHAR(5)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 5 },
    { tid: doctorsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: doctorsTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: doctorsTableId, name: 'specialization', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: doctorsTableId, name: 'license_no', type: 'VARCHAR(50)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 3 },
    { tid: doctorsTableId, name: 'phone', type: 'VARCHAR(20)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: appointmentsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: appointmentsTableId, name: 'patient_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: appointmentsTableId, name: 'doctor_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: appointmentsTableId, name: 'appointment_date', type: 'TIMESTAMP', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: appointmentsTableId, name: 'status', type: 'VARCHAR(20)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: "'scheduled'", order_index: 4 },
    { tid: appointmentsTableId, name: 'notes', type: 'TEXT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 5 },
    { tid: prescriptionsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: prescriptionsTableId, name: 'appointment_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: prescriptionsTableId, name: 'medication', type: 'TEXT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: prescriptionsTableId, name: 'dosage', type: 'VARCHAR(100)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: prescriptionsTableId, name: 'duration_days', type: 'INT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
  ];

  for (const col of hospitalColumns) {
    insertCol.run(uuidv4(), col.tid, col.name, col.type, col.nullable, (col as any).default_val || null, col.is_pk, col.is_unique, col.auto_increment, col.order_index);
  }

  // ==================== COLLEGE PROJECT ====================
  const collegeId = uuidv4();
  db.prepare(`INSERT INTO projects (id, user_id, name, description, db_type) VALUES (?, ?, ?, ?, ?)`).run(
    collegeId, userId, 'College Management System', 'Student, teacher, course and enrollment management', 'postgresql'
  );

  const studentsTableId = uuidv4();
  const teachersTableId = uuidv4();
  const coursesTableId = uuidv4();
  const enrollmentsTableId = uuidv4();

  const collegeTables = [
    { id: studentsTableId, name: 'students', x: 50, y: 50 },
    { id: teachersTableId, name: 'teachers', x: 450, y: 50 },
    { id: coursesTableId, name: 'courses', x: 450, y: 280 },
    { id: enrollmentsTableId, name: 'enrollments', x: 200, y: 400 },
  ];

  for (const t of collegeTables) {
    db.prepare(`INSERT INTO db_tables (id, project_id, name, position_x, position_y) VALUES (?, ?, ?, ?, ?)`).run(
      t.id, collegeId, t.name, t.x, t.y
    );
  }

  const collegeColumns = [
    { tid: studentsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: studentsTableId, name: 'roll_no', type: 'VARCHAR(20)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 1 },
    { tid: studentsTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: studentsTableId, name: 'email', type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 3 },
    { tid: studentsTableId, name: 'department', type: 'VARCHAR(100)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: studentsTableId, name: 'year', type: 'INT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 5 },
    { tid: teachersTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: teachersTableId, name: 'name', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: teachersTableId, name: 'email', type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 2 },
    { tid: teachersTableId, name: 'department', type: 'VARCHAR(100)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: teachersTableId, name: 'designation', type: 'VARCHAR(100)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: coursesTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: coursesTableId, name: 'course_code', type: 'VARCHAR(20)', nullable: 0, is_pk: 0, is_unique: 1, auto_increment: 0, order_index: 1 },
    { tid: coursesTableId, name: 'title', type: 'VARCHAR(200)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: coursesTableId, name: 'teacher_id', type: 'INT', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 3 },
    { tid: coursesTableId, name: 'credits', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
    { tid: enrollmentsTableId, name: 'id', type: 'SERIAL', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1, order_index: 0 },
    { tid: enrollmentsTableId, name: 'student_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 1 },
    { tid: enrollmentsTableId, name: 'course_id', type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 2 },
    { tid: enrollmentsTableId, name: 'enrolled_at', type: 'TIMESTAMP', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, default_val: 'CURRENT_TIMESTAMP', order_index: 3 },
    { tid: enrollmentsTableId, name: 'grade', type: 'VARCHAR(5)', nullable: 1, is_pk: 0, is_unique: 0, auto_increment: 0, order_index: 4 },
  ];

  for (const col of collegeColumns) {
    insertCol.run(uuidv4(), col.tid, col.name, col.type, col.nullable, (col as any).default_val || null, col.is_pk, col.is_unique, col.auto_increment, col.order_index);
  }

  // ==================== BANKING PROJECT ====================
  const bankId = uuidv4();
  db.prepare(`INSERT INTO projects (id, user_id, name, description, db_type) VALUES (?, ?, ?, ?, ?)`).run(
    bankId, userId, 'Banking Database', 'Core banking system with accounts, transactions and loans', 'postgresql'
  );

  console.log('✅ Demo data seeded successfully');
  console.log('   Demo credentials: demo@dbmsstudio.com / demo1234');
}
