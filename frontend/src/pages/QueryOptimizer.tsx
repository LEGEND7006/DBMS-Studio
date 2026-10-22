import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, AlertCircle, AlertTriangle, Info, TrendingUp, Copy, Play } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { AIThinking, ScoreGauge, SeverityBadge } from '../components/UI';
import { aiAPI } from '../services/api';
import { useProjectsStore, useToastStore, useAIStore } from '../store';
import { SQLOptimizationResult } from '../types';
import { clsx } from 'clsx';

export const QueryOptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const { provider, gemmaModel } = useAIStore();
  const [sql, setSql] = useState(
    `SELECT *\nFROM orders\nWHERE customer_id IN (\n    SELECT id\n    FROM customers\n    WHERE city = 'Mumbai'\n);`
  );
  const [result, setResult] = useState<SQLOptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOptimize = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    try {
      const res = await aiAPI.optimizeSQL(sql, activeProject?.id);
      setResult(res.data);
    } catch {
      addToast({ type: 'error', message: 'Failed to optimize query' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: 'success', message: 'Copied to clipboard' });
  };

  const severityIcon = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const severityColor = {
    critical: 'text-red-400 bg-red-900/20 border-red-800/30',
    warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
    info: 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar title="Query Optimizer" subtitle="AI-powered SQL query optimization" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Input */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-semibold text-dark-100">Paste your SQL query</h2>
            </div>
            {provider === 'gemma4' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Gemma 4 Optimizer
              </span>
            )}
          </div>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            className="input font-mono text-sm min-h-[140px] resize-y text-green-400"
            placeholder="Paste your SQL query here..."
          />
          <button onClick={handleOptimize} disabled={!sql.trim() || loading} className="btn-primary mt-3">
            <Zap className="w-4 h-4" /> Analyze & Optimize
          </button>
        </div>

        {loading && (
          <div className="card p-6">
            <AIThinking
              message={
                provider === 'gemma4'
                  ? `Google Gemma 4 (${gemmaModel}) is benchmarking execution bottlenecks...`
                  : 'Analyzing query performance...'
              }
            />
          </div>
        )}

        {result && !loading && (
          <>
            {/* Score comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6 flex flex-col items-center">
                <ScoreGauge score={result.scoreBefore} label="Original Score" size="sm" />
              </div>
              <div className="card p-6 flex flex-col items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary-400 mb-2" />
                <span className="text-2xl font-bold text-primary-400">~{result.estimatedImprovement}%</span>
                <span className="text-xs text-dark-400">Estimated Improvement</span>
                <span className="text-[10px] text-dark-500 mt-1">(simulated)</span>
              </div>
              <div className="card p-6 flex flex-col items-center">
                <ScoreGauge score={result.scoreAfter} label="Optimized Score" size="sm" />
              </div>
            </div>

            {/* Issues */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-dark-100 mb-4">Problems Detected ({result.issues.length})</h3>
              <div className="space-y-3">
                {result.issues.map((issue, i) => {
                  const Icon = severityIcon[issue.severity];
                  return (
                    <div key={i} className={clsx('p-4 rounded-lg border', severityColor[issue.severity])}>
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityBadge severity={issue.severity} />
                          </div>
                          <p className="text-sm text-dark-200 mb-1">{issue.description}</p>
                          <p className="text-xs text-dark-400">💡 {issue.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SQL Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-dark-300">Original Query</h4>
                  <button onClick={() => handleCopy(result.originalSql)} className="btn-ghost text-xs">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <pre className="code-block text-xs max-h-64 overflow-y-auto !text-red-400/80">{result.originalSql}</pre>
              </div>
              <div className="card p-4 border-primary-800/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-primary-400">✨ Optimized Query</h4>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleCopy(result.optimizedSql)} className="btn-ghost text-xs">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={() => navigate('/editor', { state: { sql: result.optimizedSql } })}
                      className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" /> Run in Editor
                    </button>
                  </div>
                </div>
                <pre className="code-block text-xs max-h-64 overflow-y-auto">{result.optimizedSql}</pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
