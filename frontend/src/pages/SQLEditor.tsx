import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, AlignLeft, Sparkles, Zap, Save, Download, Clock, CheckCircle,
  XCircle, Copy, Rows3
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { AIThinking } from '../components/UI';
import { queriesAPI, aiAPI } from '../services/api';
import { useProjectsStore, useToastStore } from '../store';
import { QueryResult, SQLExplanationResult } from '../types';

export const SQLEditorPage: React.FC = () => {
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const [sql, setSql] = useState(
    `-- Write your SQL query here\n-- Use Ctrl+Enter to execute\n\nSELECT \n    u.id,\n    u.name,\n    u.email,\n    COUNT(o.id) AS total_orders,\n    SUM(o.total_amount) AS total_spent\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.status != 'cancelled'\nGROUP BY u.id, u.name, u.email\nORDER BY total_spent DESC\nLIMIT 10;`
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [explanation, setExplanation] = useState<SQLExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'explain'>('results');

  const handleRun = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setActiveTab('results');
    try {
      const res = await queriesAPI.execute(sql, activeProject?.id);
      setResult(res.data);
    } catch (err: any) {
      setResult({
        queryId: '',
        columns: ['error'],
        rows: [[err.response?.data?.error || 'Query execution failed']],
        rowsAffected: 0,
        executionTime: 0,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!sql.trim()) return;
    setExplaining(true);
    setActiveTab('explain');
    try {
      const res = await aiAPI.explainSQL(sql);
      setExplanation(res.data);
    } catch {
      addToast({ type: 'error', message: 'Failed to explain query' });
    } finally {
      setExplaining(false);
    }
  };

  const handleFormat = () => {
    // Basic SQL formatting
    let formatted = sql
      .replace(/\bSELECT\b/gi, '\nSELECT\n   ')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bAND\b/gi, '\n  AND')
      .replace(/\bOR\b/gi, '\n  OR')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
      .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bHAVING\b/gi, '\nHAVING')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .replace(/\n\n+/g, '\n')
      .trim();
    setSql(formatted);
    addToast({ type: 'success', message: 'SQL formatted' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    addToast({ type: 'success', message: 'SQL copied' });
  };

  const complexityColor = {
    simple: 'badge-green',
    moderate: 'badge-yellow',
    complex: 'badge-red',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="SQL Editor" subtitle="Write, run, and analyze SQL queries" />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-700 bg-dark-900/80">
        <button onClick={handleRun} disabled={loading} className="btn-primary text-xs py-1.5">
          <Play className="w-3.5 h-3.5" /> Run
        </button>
        <button onClick={handleFormat} className="btn-secondary text-xs py-1.5">
          <AlignLeft className="w-3.5 h-3.5" /> Format
        </button>
        <button onClick={handleExplain} disabled={explaining} className="btn-secondary text-xs py-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Explain
        </button>
        <button onClick={handleCopy} className="btn-secondary text-xs py-1.5">
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-dark-400">
          {activeProject && (
            <span className="badge-blue">{activeProject.db_type.toUpperCase()}</span>
          )}
          <span className="badge-gray">Demo Mode</span>
        </div>
      </div>

      {/* Editor + Results split */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Monaco Editor */}
        <div className="h-[45%] border-b border-dark-700">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sql}
            onChange={(v) => setSql(v || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 12 },
              automaticLayout: true,
            }}
            onMount={(editor) => {
              editor.addAction({
                id: 'run-query',
                label: 'Run Query',
                keybindings: [2048 | 3], // Ctrl+Enter
                run: () => handleRun(),
              });
            }}
          />
        </div>

        {/* Results Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-dark-700 bg-dark-900/50 px-4">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results' ? 'text-primary-400 border-primary-500' : 'text-dark-400 border-transparent hover:text-dark-200'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5 inline mr-1.5" /> Results
            </button>
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'explain' ? 'text-primary-400 border-primary-500' : 'text-dark-400 border-transparent hover:text-dark-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5" /> Explanation
            </button>

            {result && result.status === 'success' && (
              <div className="ml-auto flex items-center gap-3 text-xs text-dark-400">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-primary-400" /> {result.rowsAffected} rows</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {result.executionTime}ms</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8"><AIThinking message="Executing query..." /></div>
            ) : activeTab === 'results' ? (
              result ? (
                result.status === 'error' ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <XCircle className="w-4 h-4" /> Query Error
                    </div>
                    <pre className="text-sm text-red-300 font-mono bg-red-900/20 p-3 rounded-lg">{result.rows[0]?.[0]}</pre>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="font-mono text-xs">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="font-mono text-xs">{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-dark-500 text-sm">
                  Run a query to see results (Ctrl+Enter)
                </div>
              )
            ) : explaining ? (
              <div className="p-8"><AIThinking message="Analyzing query..." /></div>
            ) : explanation ? (
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={complexityColor[explanation.complexity]}>
                      {explanation.complexity.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-dark-200">Query Analysis</span>
                  </div>
                  <p className="text-sm text-dark-300">{explanation.summary}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Clause Breakdown</h4>
                  {explanation.breakdown.map((b, i) => (
                    <div key={i} className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                      <span className="text-primary-400 font-mono text-xs font-bold">{b.clause}</span>
                      <p className="text-xs text-dark-300 mt-1">{b.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-dark-500 text-sm">
                Click "Explain" to get an AI explanation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
