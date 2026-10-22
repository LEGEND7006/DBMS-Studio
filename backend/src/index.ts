import 'dotenv/config';
import { app } from './app';
import { initializeDatabase } from './db/database';
import { seedDemoData } from './db/seeder';
import { loadAIConfig } from './services/aiConfig';
import { getAIService } from './services/aiFactory';

const PORT = process.env.PORT || 5000;

// Initialize DB and start server
async function startServer() {
  try {
    initializeDatabase();
    await seedDemoData();
    const aiConfig = loadAIConfig();
    getAIService();

    app.listen(PORT, () => {
      console.log(`\n🚀 Intelligent DBMS Studio Backend`);
      console.log(`   Server: http://localhost:${PORT}`);
      console.log(`   AI Engine: ${aiConfig.provider.toUpperCase()} (${aiConfig.provider === 'gemma4' ? `Gemma 4 Model: ${aiConfig.gemmaModel} @ ${aiConfig.gemmaEndpoint}` : 'Demo'})`);
      console.log(`   Demo login: demo@dbmsstudio.com / demo1234\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
