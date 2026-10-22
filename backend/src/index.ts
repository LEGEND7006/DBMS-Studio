import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { initializeDatabase } from './db/database';
import { seedDemoData } from './db/seeder';
import { loadAIConfig, getAIConfig } from './services/aiConfig';
import { getAIService } from './services/aiFactory';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import tableRoutes from './routes/tables';
import aiRoutes from './routes/ai';
import queryRoutes from './routes/queries';
import relationshipRoutes from './routes/relationships';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests. Please wait a moment.' }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/relationships', relationshipRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', mode: process.env.AI_API_KEY ? 'live' : 'demo' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

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
