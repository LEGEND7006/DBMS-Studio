import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Copy, CheckCircle } from 'lucide-react';
import { useUIStore, useProjectsStore, useToastStore, useAIStore } from '../store';
import { aiAPI } from '../services/api';
import { AIThinking } from './UI';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  timestamp: Date;
}

export const AICopilotDrawer: React.FC = () => {
  const { aiDrawerOpen, setAIDrawerOpen } = useUIStore();
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const { provider, gemmaModel } = useAIStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI database copilot, powered by **Google Gemma 4**.\n\nI can help you with:\n• Generate complex SQL from natural language\n• Explain query execution plans & clauses\n• Optimize SQL performance & eliminate anti-patterns\n• Architect table schemas & detect normalization issues\n• Recommend targeted B-Tree & composite indexes\n\n${activeProject ? `Currently attached to project: **${activeProject.name}** (${activeProject.db_type.toUpperCase()}).` : 'Select a project to enable deep schema-context intelligence.'}\n\nWhat would you like to build or optimize?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: prompt, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const lower = prompt.toLowerCase();
      let responseContent = '';
      let responseSql = '';

      if (lower.includes('explain') && lower.includes('select')) {
        const sqlMatch = prompt.match(/```([\s\S]+?)```/) || prompt.match(/(SELECT[\s\S]+)/i);
        const sql = sqlMatch ? sqlMatch[1].trim() : prompt;
        const res = await aiAPI.explainSQL(sql);
        responseContent = `**${res.data.complexity.toUpperCase()} Query**\n\n${res.data.summary}\n\n**Breakdown:**\n${res.data.breakdown.map((b: any) => `• **${b.clause}**: ${b.explanation}`).join('\n')}`;
      } else if (lower.includes('optimize') || lower.includes('improve') || lower.includes('faster')) {
        const sqlMatch = prompt.match(/```([\s\S]+?)```/) || prompt.match(/(SELECT[\s\S]+)/i);
        if (sqlMatch) {
          const res = await aiAPI.optimizeSQL(sqlMatch[1].trim(), activeProject?.id);
          responseSql = res.data.optimizedSql;
          responseContent = `**Performance Score:** ${res.data.scoreBefore} → ${res.data.scoreAfter}/100\n**Estimated Improvement:** ~${res.data.estimatedImprovement}% faster\n\n**Issues Found:**\n${res.data.issues.map((i: any) => `• ${i.severity === 'critical' ? '🔴' : '🟡'} ${i.description}`).join('\n')}\n\n**Optimized SQL:**`;
        } else {
          responseContent = 'Please provide the SQL query you want to optimize. You can paste it directly or wrap it in ``` marks.';
        }
      } else {
        // Default: treat as SQL generation
        const res = await aiAPI.generateSQL(prompt, activeProject?.id);
        responseSql = res.data.sql;
        responseContent = `${res.data.explanation}\n\n**Tables Used:** ${res.data.tablesUsed.join(', ')}\n\n**Assumptions:**\n${res.data.assumptions.map((a: string) => `• ${a}`).join('\n')}`;
        if (res.data.performanceConcerns.length > 0) {
          responseContent += `\n\n**⚡ Performance Tips:**\n${res.data.performanceConcerns.map((c: string) => `• ${c}`).join('\n')}`;
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseContent, sql: responseSql, timestamp: new Date() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please try again.', timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    addToast({ type: 'success', message: 'Copied to clipboard' });
  };

  if (!aiDrawerOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={() => setAIDrawerOpen(false)} />
      <div className="relative ml-auto w-[420px] bg-dark-900 border-l border-dark-700 flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700 bg-dark-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-dark-100">AI Database Copilot</h3>
              {provider && provider !== 'demo' && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {provider === 'gemma4' ? 'Gemma 4' : provider === 'googleai' ? 'Google AI' : provider === 'openrouter' ? 'OpenRouter' : provider}
                </span>
              )}
            </div>
            <p className="text-xs text-dark-400">
              {provider === 'gemma4' ? `${gemmaModel} • Thinking Mode` : provider === 'googleai' ? 'Gemini & Gemma Models' : provider === 'openrouter' ? 'OpenRouter Cloud' : 'Database Assistant'}
            </p>
          </div>
          <button onClick={() => setAIDrawerOpen(false)} className="p-1 rounded hover:bg-dark-700 text-dark-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary-900 border border-primary-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800 border border-dark-700 text-dark-200'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="text-dark-100 font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
                {msg.sql && (
                  <div className="mt-2 relative">
                    <pre className="bg-dark-950 border border-dark-700 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto whitespace-pre">
                      {msg.sql}
                    </pre>
                    <button
                      onClick={() => handleCopy(msg.sql!, idx)}
                      className="absolute top-2 right-2 p-1 rounded bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-100"
                    >
                      {copiedIndex === idx ? <CheckCircle className="w-3.5 h-3.5 text-primary-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-dark-300" />
                </div>
              )}
            </div>
          ))}
          {loading && <AIThinking message="Analyzing your request..." />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-dark-700 bg-dark-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your database..."
              className="input text-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['Generate SQL', 'Suggest indexes', 'Explain query', 'Optimize query'].map((s) => (
              <button
                key={s}
                onClick={() => setInput(s.toLowerCase())}
                className="text-xs px-2 py-1 bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-200 rounded-md transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
