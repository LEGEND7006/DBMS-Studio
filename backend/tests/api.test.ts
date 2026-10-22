import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../src/app';
import { initializeDatabase } from '../src/db/database';
import { seedDemoData } from '../src/db/seeder';

let server: http.Server;
let baseUrl: string;
let authToken: string;
let testProjectId: string;
let testTableId1: string;
let testTableId2: string;
let testColumnId1: string;
let testColumnId2: string;
let testRelationshipId: string;
let testQueryId: string;

before(async () => {
  initializeDatabase();
  await seedDemoData();

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
});

describe('Intelligent DBMS Studio - Backend Integration Test Suite', () => {
  describe('1. Health & Status API', () => {
    it('GET /api/health should return status ok and semantic version', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.status, 'ok');
      assert.equal(data.version, '1.0.0');
    });
  });

  describe('2. Authentication Flow', () => {
    it('POST /api/auth/login should reject bad credentials with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@dbmsstudio.com', password: 'wrong_password' })
      });
      assert.equal(res.status, 401);
    });

    it('POST /api/auth/login should authenticate demo account and return token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@dbmsstudio.com', password: 'demo1234' })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(data.token);
      assert.equal(data.user.email, 'demo@dbmsstudio.com');
      authToken = data.token;
    });

    it('GET /api/auth/me should reject unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.equal(res.status, 401);
    });

    it('GET /api/auth/me should return current user profile with valid token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.user.email, 'demo@dbmsstudio.com');
    });

    it('POST /api/auth/register should create new user account', async () => {
      const uniqueEmail = `test_${Date.now()}@example.com`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'QA Automation',
          email: uniqueEmail,
          password: 'Password123!'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      assert.ok(data.token);
      assert.equal(data.user.email, uniqueEmail);
    });
  });

  describe('3. Projects & Schema Design API', () => {
    it('GET /api/projects should return project list for user', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(Array.isArray(data.projects));
    });

    it('POST /api/projects should create a new database project', async () => {
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Warehouse ERP System',
          description: 'Automated integration testing project',
          db_type: 'postgresql'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      assert.ok(data.project.id);
      assert.equal(data.project.name, 'Warehouse ERP System');
      testProjectId = data.project.id;
    });

    it('POST /api/projects/:id/tables should create parent table (suppliers)', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'suppliers',
          description: 'Product suppliers catalog',
          columns: [
            { name: 'supplier_id', data_type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1 },
            { name: 'company_name', data_type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0 }
          ]
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      assert.ok(data.table.id);
      assert.equal(data.table.name, 'suppliers');
      testTableId1 = data.table.id;
      testColumnId1 = data.table.columns[0].id;
    });

    it('POST /api/projects/:id/tables should create child table (products)', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'products',
          description: 'Products inventory',
          columns: [
            { name: 'product_id', data_type: 'INT', nullable: 0, is_pk: 1, is_unique: 1, auto_increment: 1 },
            { name: 'product_name', data_type: 'VARCHAR(255)', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0 },
            { name: 'supplier_id', data_type: 'INT', nullable: 0, is_pk: 0, is_unique: 0, auto_increment: 0 }
          ]
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      testTableId2 = data.table.id;
      testColumnId2 = data.table.columns[2].id;
    });

    it('POST /api/tables/:id/columns should append a new column to table', async () => {
      const res = await fetch(`${baseUrl}/api/tables/${testTableId2}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'unit_price',
          data_type: 'DECIMAL(10,2)',
          nullable: 1,
          default_val: '0.00'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      assert.equal(data.column.name, 'unit_price');
    });

    it('PUT /api/tables/:id should update table metadata and position', async () => {
      const res = await fetch(`${baseUrl}/api/tables/${testTableId1}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'suppliers_directory',
          position_x: 250,
          position_y: 350
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.table.name, 'suppliers_directory');
    });

    it('GET /api/projects/:id/schema should return complete tables & relationships schema', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/schema`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.project.id, testProjectId);
      assert.ok(Array.isArray(data.tables));
      assert.equal(data.tables.length, 2);
    });

    it('POST /api/relationships should create a foreign key link between tables', async () => {
      const res = await fetch(`${baseUrl}/api/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          project_id: testProjectId,
          source_table_id: testTableId1,
          source_column_id: testColumnId1,
          target_table_id: testTableId2,
          target_column_id: testColumnId2,
          rel_type: 'one_to_many',
          on_delete: 'CASCADE',
          on_update: 'CASCADE'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json() as any;
      assert.ok(data.relationship.id);
      testRelationshipId = data.relationship.id;
    });

    it('DELETE /api/relationships/:id should remove the relationship', async () => {
      const res = await fetch(`${baseUrl}/api/relationships/${testRelationshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.success, true);
    });
  });

  describe('4. SQL Query Execution & History API', () => {
    it('POST /api/queries/execute should run query, return columns/rows, and log history', async () => {
      const res = await fetch(`${baseUrl}/api/queries/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          projectId: testProjectId,
          sql: 'SELECT * FROM users;'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(data.queryId);
      assert.ok(Array.isArray(data.columns));
      assert.ok(Array.isArray(data.rows));
      assert.equal(data.status, 'success');
      testQueryId = data.queryId;
    });

    it('POST /api/queries/execute should reject destructive DROP operations in demo mode', async () => {
      const res = await fetch(`${baseUrl}/api/queries/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          projectId: testProjectId,
          sql: 'DROP DATABASE production_db;'
        })
      });
      assert.equal(res.status, 403);
    });

    it('GET /api/queries/history should retrieve executed queries history', async () => {
      const res = await fetch(`${baseUrl}/api/queries/history?projectId=${testProjectId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(Array.isArray(data.queries));
      assert.ok(data.queries.some((q: any) => q.id === testQueryId));
    });

    it('DELETE /api/queries/:id should remove query from history', async () => {
      const res = await fetch(`${baseUrl}/api/queries/${testQueryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.success, true);
    });
  });

  describe('5. AI Assistant & Schema Intelligence API', () => {
    it('GET /api/ai/config should return AI provider configuration', async () => {
      const res = await fetch(`${baseUrl}/api/ai/config`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(data.provider);
      assert.ok('hasGemmaKey' in data);
    });

    it('POST /api/ai/test-connection should test AI service connectivity', async () => {
      const res = await fetch(`${baseUrl}/api/ai/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ provider: 'demo' })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.equal(data.success, true);
    });

    it('POST /api/ai/generate-sql should generate SQL from natural language prompt', async () => {
      const res = await fetch(`${baseUrl}/api/ai/generate-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          projectId: testProjectId,
          prompt: 'Get all products with unit_price greater than 50'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(data.sql);
    });

    it('POST /api/ai/explain-sql should explain SQL query purpose and performance notes', async () => {
      const res = await fetch(`${baseUrl}/api/ai/explain-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          sql: 'SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.name'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(data.explanation || data.summary || data.steps);
    });

    it('POST /api/ai/analyze-schema should audit project tables and suggest optimizations', async () => {
      const res = await fetch(`${baseUrl}/api/ai/analyze-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ projectId: testProjectId })
      });
      assert.equal(res.status, 200);
      const data = await res.json() as any;
      assert.ok(typeof data.healthScore === 'number');
      assert.ok(Array.isArray(data.categories));
      assert.ok(Array.isArray(data.issues));
    });
  });
});
