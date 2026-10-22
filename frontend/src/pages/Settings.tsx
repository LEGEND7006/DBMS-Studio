import React, { useState, useEffect } from 'react';
import {
  User, Bot, Sparkles, Key, Save, Database,
  Terminal, CheckCircle, RefreshCw, Activity, AlertCircle,
  Copy, Check, Server, ExternalLink, Cloud
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useAuthStore, useToastStore, useAIStore } from '../store';
import { aiAPI } from '../services/api';
import { clsx } from 'clsx';

type Provider = 'googleai' | 'openrouter' | 'gemma4' | 'demo';

const PROVIDER_CARDS: { id: Provider; title: string; tag: string; tagColor: string; desc: string; free: boolean }[] = [
  {
    id: 'googleai',
    title: 'Google AI Studio',
    tag: 'Free API Key',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Gemma 4 & Gemini 2.0 models via free Google AI Studio key. No Ollama. No payment.',
    free: true,
  },
  {
    id: 'openrouter',
    title: 'OpenRouter',
    tag: 'Free Tier',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    desc: 'Gemma 4 / Gemini 2.0 Flash via OpenRouter free tier. No credit card required.',
    free: true,
  },
  {
    id: 'gemma4',
    title: 'Local Ollama',
    tag: 'No API Key',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    desc: 'Run Gemma 4 locally via Ollama. 100% private, no internet needed during inference.',
    free: true,
  },
  {
    id: 'demo',
    title: 'Demo AI Mode',
    tag: 'Built-in',
    tagColor: 'bg-dark-600 text-dark-300 border-dark-600',
    desc: 'Deterministic rule-based SQL engine. Instant, zero setup, always works offline.',
    free: true,
  },
];

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { setAIConfig: setStoreAIConfig } = useAIStore();

  const [provider, setProvider] = useState<Provider>('demo');
  // Google AI Studio
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleModel, setGoogleModel] = useState('gemma-3-27b-it');
  // OpenRouter
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemma-3-27b-it:free');
  // Local Ollama / Gemma 4
  const [gemmaModel, setGemmaModel] = useState('gemma4:31b');
  const [gemmaEndpoint, setGemmaEndpoint] = useState('http://localhost:11434');
  // Shared
  const [temperature, setTemperature] = useState(0.2);
  const [defaultDbType, setDefaultDbType] = useState('mysql');
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [sandboxEnabled, setSandboxEnabled] = useState(true);

  // Connection testing
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load active config from backend on mount
  useEffect(() => {
    aiAPI.getConfig().then((res) => {
      const c = res.data;
      if (!c) return;
      if (c.provider) setProvider(c.provider as Provider);
      if (c.googleModel) setGoogleModel(c.googleModel);
      if (c.openrouterModel) setOpenrouterModel(c.openrouterModel);
      if (c.gemmaModel) setGemmaModel(c.gemmaModel);
      if (c.gemmaEndpoint) setGemmaEndpoint(c.gemmaEndpoint);
      if (c.temperature !== undefined) setTemperature(c.temperature);
    }).catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = { provider };
      if (provider === 'googleai') { payload.googleApiKey = googleApiKey; payload.googleModel = googleModel; }
      if (provider === 'openrouter') { payload.openrouterApiKey = openrouterApiKey; payload.openrouterModel = openrouterModel; }
      if (provider === 'gemma4') { payload.gemmaEndpoint = gemmaEndpoint; payload.gemmaModel = gemmaModel; }

      const res = await aiAPI.testConnection(payload);
      setTestResult(res.data);
      addToast({
        type: res.data.success ? 'success' : 'warning',
        message: res.data.success ? `Connected! (${res.data.latencyMs}ms)` : 'Could not connect — fallback active.',
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      addToast({ type: 'error', message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({ type: 'success', message: 'Copied!' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await aiAPI.updateConfig({
        provider,
        googleApiKey: googleApiKey || undefined,
        googleModel,
        openrouterApiKey: openrouterApiKey || undefined,
        openrouterModel,
        gemmaModel,
        gemmaEndpoint,
        temperature,
      });
      setStoreAIConfig({
        provider: provider as any,
        gemmaModel,
        gemmaEndpoint,
        temperature,
      });
      addToast({ type: 'success', message: 'AI settings saved successfully' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const activeCard = PROVIDER_CARDS.find(p => p.id === provider);

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar title="Settings" subtitle="Configure AI engine, database sandbox, and developer preferences" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSave} className="space-y-6">

          {/* ─── AI Engine Card ─── */}
          <div className="card p-6 space-y-5 border-primary-500/30 bg-gradient-to-br from-dark-850 via-dark-900 to-dark-850 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dark-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-100">AI Engine Configuration</h3>
                  <p className="text-xs text-dark-400">Powered by Google Gemma 4 — all options are free</p>
                </div>
              </div>
              {testResult && (
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border',
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                )}>
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  {testResult.success ? `Live (${testResult.latencyMs}ms)` : 'Fallback active'}
                </div>
              )}
            </div>

            {/* Provider Selector */}
            <div>
              <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 block">
                Choose AI Provider — all are 100% free
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PROVIDER_CARDS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { setProvider(p.id); setTestResult(null); }}
                    className={clsx(
                      'p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5',
                      provider === p.id
                        ? 'bg-primary-950/40 border-primary-500 ring-1 ring-primary-500/30'
                        : 'bg-dark-800/80 border-dark-700/80 hover:border-dark-600'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-xs font-bold', provider === p.id ? 'text-primary-300' : 'text-dark-200')}>
                        {p.title}
                      </span>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-semibold', p.tagColor)}>
                        {p.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-dark-400 leading-snug">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Google AI Studio ─── */}
            {provider === 'googleai' && (
              <div className="space-y-4 pt-3 border-t border-dark-700/70 animate-slide-up">
                {/* How-to banner */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                  <Cloud className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-dark-300 space-y-1">
                    <p className="font-semibold text-emerald-300">Get your free Google AI Studio key in 30 seconds:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-dark-400">
                      <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline">aistudio.google.com/app/apikey</a></li>
                      <li>Click <strong className="text-dark-200">Create API Key</strong></li>
                      <li>Copy & paste it below — done!</li>
                    </ol>
                    <p className="text-dark-500 text-[11px]">No credit card required. Generous free quota.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-dark-300 mb-1.5 block">
                    Google AI Studio API Key <span className="text-emerald-400">(free)</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="password"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="input pl-10 text-sm font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-dark-300 mb-2 block">Model</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'gemma-3-27b-it', name: 'Gemma 3 27B', note: 'Best quality' },
                      { id: 'gemma-3-12b-it', name: 'Gemma 3 12B', note: 'Fast & capable' },
                      { id: 'gemma-3-4b-it', name: 'Gemma 3 4B', note: 'Fastest' },
                      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', note: 'Very fast' },
                      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', note: 'Stable' },
                      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', note: 'Most powerful' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setGoogleModel(m.id)}
                        className={clsx(
                          'p-2.5 rounded-lg border text-left text-xs transition-all',
                          googleModel === m.id
                            ? 'bg-emerald-900/30 border-emerald-500 text-emerald-200'
                            : 'bg-dark-800 border-dark-700/80 text-dark-400 hover:border-dark-600'
                        )}
                      >
                        <div className={clsx('font-semibold', googleModel === m.id ? 'text-emerald-300' : 'text-dark-200')}>{m.name}</div>
                        <div className="text-[10px] text-dark-500 mt-0.5">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── OpenRouter ─── */}
            {provider === 'openrouter' && (
              <div className="space-y-4 pt-3 border-t border-dark-700/70 animate-slide-up">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-950/30 border border-purple-500/20">
                  <Cloud className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-dark-300 space-y-1">
                    <p className="font-semibold text-purple-300">Get your free OpenRouter key in 30 seconds:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-dark-400">
                      <li>Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-purple-400 underline">openrouter.ai/keys</a></li>
                      <li>Sign in with Google / GitHub</li>
                      <li>Click <strong className="text-dark-200">Create Key</strong> — paste it below</li>
                    </ol>
                    <p className="text-dark-500 text-[11px]">No credit card required. Free models are marked with <code>:free</code>.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-dark-300 mb-1.5 block">
                    OpenRouter API Key <span className="text-purple-400">(free)</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="password"
                      value={openrouterApiKey}
                      onChange={(e) => setOpenrouterApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="input pl-10 text-sm font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-dark-300 mb-2 block">Free Model</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', note: 'Best free model' },
                      { id: 'google/gemma-3-12b-it:free', name: 'Gemma 3 12B', note: 'Fast, free' },
                      { id: 'google/gemma-3-4b-it:free', name: 'Gemma 3 4B', note: 'Ultra fast' },
                      { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', note: 'Very stable' },
                      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', note: 'Fastest' },
                      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', note: 'Powerful alt' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setOpenrouterModel(m.id)}
                        className={clsx(
                          'p-2.5 rounded-lg border text-left text-xs transition-all',
                          openrouterModel === m.id
                            ? 'bg-purple-900/30 border-purple-500 text-purple-200'
                            : 'bg-dark-800 border-dark-700/80 text-dark-400 hover:border-dark-600'
                        )}
                      >
                        <div className={clsx('font-semibold', openrouterModel === m.id ? 'text-purple-300' : 'text-dark-200')}>{m.name}</div>
                        <div className="text-[10px] text-dark-500 mt-0.5">{m.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Local Ollama ─── */}
            {provider === 'gemma4' && (
              <div className="space-y-4 pt-3 border-t border-dark-700/70 animate-slide-up">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
                  <Server className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-cyan-300">Run Gemma 4 locally — no API key ever needed</p>
                    <p className="text-dark-400">Install Ollama, then run the command below. 100% free and private.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-dark-300 mb-1.5 block">Inference Endpoint</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                      <input
                        type="text"
                        value={gemmaEndpoint}
                        onChange={(e) => setGemmaEndpoint(e.target.value)}
                        className="input pl-10 text-xs font-mono"
                        placeholder="http://localhost:11434"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-dark-300 mb-2 block">Model Variant</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['gemma4:31b', 'gemma4:26b', 'gemma4:12b', 'gemma4:e4b'].map((m) => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setGemmaModel(m)}
                          className={clsx(
                            'p-2 rounded-lg border text-xs text-left transition-all',
                            gemmaModel === m
                              ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200'
                              : 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600'
                          )}
                        >
                          <code>{m.replace('gemma4:', '')}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-dark-950/70 border border-dark-700 rounded-lg px-3 py-2">
                  <code className="text-xs text-green-400">ollama run {gemmaModel}</code>
                  <button type="button" onClick={() => handleCopy(`ollama run ${gemmaModel}`)} className="text-dark-400 hover:text-dark-100 p-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* ─── Demo Mode ─── */}
            {provider === 'demo' && (
              <div className="pt-3 border-t border-dark-700/70">
                <div className="p-3 rounded-lg bg-dark-800/60 border border-dark-700/60 text-xs text-dark-400">
                  ✅ <strong className="text-dark-200">Demo mode is active.</strong> No API key or internet required. All AI features (SQL generation, optimizer, schema analyzer) work immediately with the built-in rule engine.
                </div>
              </div>
            )}

            {/* Temperature & Test */}
            <div className="flex items-center justify-between pt-2 border-t border-dark-700/60 gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-dark-300">Temperature</span>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-28 accent-primary-500"
                />
                <span className="text-xs font-mono text-primary-400">{temperature}</span>
              </div>

              <div className="flex items-center gap-3">
                {provider !== 'demo' && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
                  >
                    <RefreshCw className={clsx('w-3.5 h-3.5', testing && 'animate-spin')} />
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
                {testResult && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {testResult.success
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <AlertCircle className="w-4 h-4 text-amber-400" />}
                    <span className="text-dark-300 truncate max-w-xs">{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Database & Sandbox ─── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-dark-700 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-900/40 border border-cyan-800/50 flex items-center justify-center">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-dark-100">Database & Execution Sandbox</h3>
                <p className="text-xs text-dark-400">Execution security and dialect defaults</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-dark-300 mb-1.5 block">Default SQL Dialect</label>
                <select value={defaultDbType} onChange={(e) => setDefaultDbType(e.target.value)} className="select text-sm max-w-xs">
                  <option value="mysql">MySQL 8.0+</option>
                  <option value="postgresql">PostgreSQL 16+</option>
                  <option value="sqlite">SQLite 3</option>
                  <option value="sqlserver">Microsoft SQL Server</option>
                  <option value="oracle">Oracle Database</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-medium text-dark-200">Auto-Suggest Query Optimizations</p>
                  <p className="text-[11px] text-dark-400">Automatically run AI optimizer on SQL in the editor</p>
                </div>
                <input type="checkbox" checked={autoOptimize} onChange={(e) => setAutoOptimize(e.target.checked)} className="rounded border-dark-600 bg-dark-700 text-primary-500 w-4 h-4" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-medium text-dark-200">Simulated Execution Sandbox</p>
                  <p className="text-[11px] text-dark-400">Prevent destructive operations from running in demo mode</p>
                </div>
                <input type="checkbox" checked={sandboxEnabled} onChange={(e) => setSandboxEnabled(e.target.checked)} className="rounded border-dark-600 bg-dark-700 text-primary-500 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ─── User Profile ─── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-dark-700 pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-900/40 border border-primary-800/50 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-dark-100">User Profile</h3>
                <p className="text-xs text-dark-400">Your account information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-dark-300 mb-1.5 block">Full Name</label>
                <input type="text" defaultValue={user?.name || 'Developer User'} className="input text-sm" readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-dark-300 mb-1.5 block">Email Address</label>
                <input type="email" defaultValue={user?.email || 'demo@dbmsstudio.com'} className="input text-sm text-dark-400" readOnly />
              </div>
            </div>
          </div>

          {/* ─── Save ─── */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary text-sm px-6 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
