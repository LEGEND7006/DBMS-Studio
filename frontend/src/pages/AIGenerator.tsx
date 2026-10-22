import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Copy, Play, Zap, Sparkles, AlertTriangle, Table, ChevronRight } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { AIThinking } from '../components/UI';
import { aiAPI } from '../services/api';
import { useProjectsStore, useToastStore, useAIStore } from '../store';
import { SQLGenerationResult } from '../types';

const examplePrompts = [
  'Find the top 10 customers who spent the most money in the last 30 days',
  'Show all products with low stock inventory',
  'Get the monthly revenue report for the last 12 months',
  'Find all pending orders placed today with customer details',
  'List all patients with upcoming doctor appointments',
  'Show student enrollment details with course and teacher info',
];

export const AIGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const { provider, gemmaModel } = useAIStore();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<SQLGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await aiAPI.generateSQL(prompt, activeProject?.id);
      setResult(res.data);
    } catch {
      addToast({ type: 'error', message: 'Failed to generate SQL' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql);
      addToast({ type: 'success', message: 'SQL copied to clipboard' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar title="AI SQL Generator" subtitle="Generate SQL queries from natural language" />

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-dark-100">Natural Language Input</h2>
                </div>
                {provider === 'gemma4' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" /> Gemma 4 Reasoning
                  </span>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to query in plain English..."
                className="input min-h-[140px] resize-none font-sans"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
                className="btn-primary mt-3 w-full justify-center"
              >
                <Sparkles className="w-4 h-4" /> Generate SQL
              </button>
              <p className="text-xs text-dark-500 mt-2 text-center">Ctrl+Enter to generate</p>
            </div>

            {/* Example prompts */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Try These Examples</h3>
              <div className="space-y-1.5">
                {examplePrompts.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-800 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-primary-500 flex-shrink-0" />
                    <span className="line-clamp-1">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            {loading ? (
              <div className="card p-6">
                <AIThinking
                  message={
                    provider === 'gemma4'
                      ? `Google Gemma 4 (${gemmaModel}) is reasoning & synthesizing SQL...`
                      : 'Generating SQL from your description...'
                  }
                />
              </div>
            ) : result ? (
              <>
                {/* Generated SQL */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-dark-200">Generated SQL</h3>
                    <div className="flex gap-2">
                      <button onClick={handleCopy} className="btn-ghost text-xs">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <button
                        onClick={() => navigate('/editor', { state: { sql: result.sql } })}
                        className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" /> Run in Editor
                      </button>
                    </div>
                  </div>
                  <pre className="code-block text-xs max-h-80 overflow-y-auto">{result.sql}</pre>
                </div>

                {/* Explanation */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-dark-200 mb-2">Explanation</h3>
                  <p className="text-sm text-dark-300 leading-relaxed">{result.explanation}</p>
                </div>

                {/* Tables Used */}
                <div className="card p-4">
                  <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Tables Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.tablesUsed.map((t) => (
                      <span key={t} className="badge-blue font-mono">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Assumptions */}
                {result.assumptions.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Assumptions</h3>
                    <ul className="space-y-1">
                      {result.assumptions.map((a, i) => (
                        <li key={i} className="text-xs text-dark-300 flex items-start gap-2">
                          <span className="text-dark-500 mt-0.5">•</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Performance Concerns */}
                {result.performanceConcerns.length > 0 && (
                  <div className="card p-4 border-yellow-800/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Performance Concerns</h3>
                    </div>
                    <ul className="space-y-1">
                      {result.performanceConcerns.map((c, i) => (
                        <li key={i} className="text-xs text-dark-300 flex items-start gap-2">
                          <Zap className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" /> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-12 text-center">
                <Wand2 className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">Enter a natural language description and click Generate to create SQL</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
