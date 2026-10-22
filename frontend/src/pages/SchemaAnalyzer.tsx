import React, { useState } from 'react';
import { Search, AlertCircle, AlertTriangle, Info, CheckCircle, Database, RefreshCw } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { ScoreGauge, AIThinking, SeverityBadge, EmptyState } from '../components/UI';
import { aiAPI } from '../services/api';
import { useProjectsStore, useToastStore, useAIStore } from '../store';
import { SchemaAnalysisResult } from '../types';
import { clsx } from 'clsx';

export const SchemaAnalyzerPage: React.FC = () => {
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const { provider, gemmaModel } = useAIStore();
  const [result, setResult] = useState<SchemaAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!activeProject) {
      addToast({ type: 'warning', message: 'Please select a project first' });
      return;
    }
    setLoading(true);
    try {
      const res = await aiAPI.analyzeSchema(activeProject.id);
      setResult(res.data);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed to analyze schema' });
    } finally {
      setLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    Structure: 'text-blue-400',
    Relationships: 'text-purple-400',
    Indexing: 'text-yellow-400',
    Naming: 'text-cyan-400',
    Normalization: 'text-orange-400',
    Performance: 'text-primary-400',
  };

  if (!activeProject) {
    return (
      <div className="flex-1">
        <TopBar title="Schema Analyzer" subtitle="AI-powered database schema analysis" />
        <EmptyState
          icon={Database}
          title="No Project Selected"
          description="Open a project from the Projects page to analyze its schema."
          action={<a href="/projects" className="btn-primary"><Database className="w-4 h-4" /> Go to Projects</a>}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar
        title="Schema Analyzer"
        subtitle={`Analyzing: ${activeProject.name}`}
        actions={
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary text-sm">
            <Search className="w-4 h-4" /> {result ? 'Re-Analyze' : 'Analyze Schema'}
          </button>
        }
      />

      <div className="p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="card p-8">
            <AIThinking
              message={
                provider === 'gemma4'
                  ? `Google Gemma 4 (${gemmaModel}) is auditing schema normalization & foreign keys...`
                  : 'Analyzing database schema...'
              }
            />
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Health Score */}
            <div className="card p-8 flex items-center gap-8">
              <ScoreGauge score={result.healthScore} label="Database Health" size="lg" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Category Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result.categories.map((cat) => (
                    <div key={cat.name} className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('text-sm font-medium', categoryColors[cat.name] || 'text-dark-200')}>{cat.name}</span>
                        <span className="text-sm font-bold text-dark-100">{cat.score}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-1.5">
                        <div
                          className={clsx(
                            'h-1.5 rounded-full transition-all duration-1000',
                            cat.score >= 80 ? 'bg-primary-500' :
                            cat.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Issues */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-dark-100">Issues Found ({result.issues.length})</h3>
                <div className="flex gap-2 text-xs">
                  <span className="badge-red">{result.issues.filter(i => i.severity === 'critical').length} Critical</span>
                  <span className="badge-yellow">{result.issues.filter(i => i.severity === 'warning').length} Warnings</span>
                  <span className="badge-blue">{result.issues.filter(i => i.severity === 'info').length} Info</span>
                </div>
              </div>

              <div className="space-y-3">
                {result.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      'p-4 rounded-lg border',
                      issue.severity === 'critical' ? 'bg-red-900/10 border-red-800/30' :
                      issue.severity === 'warning' ? 'bg-yellow-900/10 border-yellow-800/30' :
                      'bg-blue-900/10 border-blue-800/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <SeverityBadge severity={issue.severity} />
                      </div>
                      <div className="flex-1">
                        {issue.table && (
                          <span className="text-xs font-mono text-dark-400 mb-1 block">Table: {issue.table}</span>
                        )}
                        <p className="text-sm text-dark-200 mb-1">{issue.description}</p>
                        <p className="text-xs text-dark-400">💡 {issue.suggestion}</p>
                      </div>
                      {issue.autoFixable && (
                        <button className="btn-ghost text-xs text-primary-400 hover:text-primary-300 flex-shrink-0">
                          Apply Fix
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Search className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-dark-200 mb-2">Ready to Analyze</h3>
            <p className="text-sm text-dark-400 max-w-md mx-auto mb-6">
              Click "Analyze Schema" to have AI review your database design for potential issues,
              missing indexes, normalization problems, and more.
            </p>
            <button onClick={handleAnalyze} className="btn-primary mx-auto">
              <Search className="w-4 h-4" /> Start Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
