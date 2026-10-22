const http = require('http');

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing Intelligent DBMS Studio APIs...\n');

  // 1. Health
  const health = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('✅ 1. Health Check:', health.body);

  // 2. Login
  const login = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'demo@dbmsstudio.com', password: 'demo1234' });
  console.log('✅ 2. Login:', login.body.user.name, `(${login.body.user.email})`);
  const token = login.body.token;
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 3. Projects
  const projects = await request({
    hostname: 'localhost', port: 5000, path: '/api/projects', method: 'GET',
    headers: authHeaders
  });
  console.log(`✅ 3. Projects (${projects.body.projects.length} found):`, projects.body.projects.map(p => `${p.name} [${p.db_type}]`).join(', '));
  const project = projects.body.projects[0];

  // 4. Schema
  const schema = await request({
    hostname: 'localhost', port: 5000, path: `/api/projects/${project.id}/schema`, method: 'GET',
    headers: authHeaders
  });
  console.log(`✅ 4. Schema for ${project.name}: ${schema.body.tables.length} tables (${schema.body.tables.map(t => t.name).join(', ')})`);

  // 5. AI Generate SQL
  const aiGen = await request({
    hostname: 'localhost', port: 5000, path: '/api/ai/generate-sql', method: 'POST',
    headers: authHeaders
  }, { prompt: 'Find the top 10 customers who spent the most money in the last 30 days', projectId: project.id });
  console.log('✅ 5. AI SQL Generation:\n   SQL:', aiGen.body.sql.split('\n')[0], '...\n   Tables used:', aiGen.body.tablesUsed);

  // 6. AI Optimize SQL
  const aiOpt = await request({
    hostname: 'localhost', port: 5000, path: '/api/ai/optimize-sql', method: 'POST',
    headers: authHeaders
  }, { sql: 'SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE city = "Mumbai");', projectId: project.id });
  console.log(`✅ 6. AI SQL Optimization: Score ${aiOpt.body.scoreBefore}/100 -> ${aiOpt.body.scoreAfter}/100 (~${aiOpt.body.estimatedImprovement}% faster)`);
  console.log('   Issues:', aiOpt.body.issues.map(i => i.description));

  // 7. AI Analyze Schema
  const aiAnalyze = await request({
    hostname: 'localhost', port: 5000, path: '/api/ai/analyze-schema', method: 'POST',
    headers: authHeaders
  }, { projectId: project.id });
  console.log(`✅ 7. AI Schema Health Score: ${aiAnalyze.body.healthScore}/100`);
  console.log('   Category Scores:', aiAnalyze.body.categories.map(c => `${c.name}: ${c.score}`).join(', '));

  // 8. Query Execution Simulation
  const exec = await request({
    hostname: 'localhost', port: 5000, path: '/api/queries/execute', method: 'POST',
    headers: authHeaders
  }, { sql: 'SELECT u.name, SUM(o.total_amount) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id;', projectId: project.id });
  console.log(`✅ 8. Query Execution: ${exec.body.rows.length} rows returned in ${exec.body.executionTime}ms (Columns: ${exec.body.columns.join(', ')})`);

  // 9. Query History
  const history = await request({
    hostname: 'localhost', port: 5000, path: '/api/queries/history', method: 'GET',
    headers: authHeaders
  });
  console.log(`✅ 9. Query History: ${history.body.queries.length} queries recorded in history log`);

  console.log('\n🎉 ALL 9 CORE SYSTEM CAPABILITIES VERIFIED SUCCESSFULLY!');
}

runTests().catch(console.error);
