import React from 'react';
import { Bell, Bot, ChevronDown, Database, Sparkles } from 'lucide-react';
import { useProjectsStore, useUIStore, useAIStore } from '../store';
import { clsx } from 'clsx';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
  const { activeProject } = useProjectsStore();
  const { setAIDrawerOpen } = useUIStore();
  const { provider, gemmaModel } = useAIStore();

  const dbTypeColors: Record<string, string> = {
    mysql: 'text-orange-400',
    postgresql: 'text-blue-400',
    sqlite: 'text-cyan-400',
    sqlserver: 'text-red-400',
    oracle: 'text-yellow-400',
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900/50 backdrop-blur-sm flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-dark-100">{title}</h1>
        {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Active project indicator */}
        {activeProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg">
            <Database className={clsx('w-3.5 h-3.5', dbTypeColors[activeProject.db_type] || 'text-dark-400')} />
            <span className="text-sm text-dark-200 font-medium">{activeProject.name}</span>
            <span className={clsx('text-xs font-mono uppercase', dbTypeColors[activeProject.db_type] || 'text-dark-400')}>
              {activeProject.db_type}
            </span>
          </div>
        )}

        {actions}

        {/* AI Engine Status Pill (shown only when a live AI provider is connected) */}
        {provider && provider !== 'demo' && (() => {
          const label =
            provider === 'googleai' ? 'Google AI' :
            provider === 'openrouter' ? 'OpenRouter' :
            provider === 'gemma4' ? 'Gemma 4' : null;
          if (!label) return null;
          const color =
            provider === 'googleai' ? 'text-emerald-400' :
            provider === 'openrouter' ? 'text-purple-400' :
            provider === 'gemma4' ? 'text-blue-400' :
            'text-primary-400';
          return (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-dark-800 border border-dark-700/80 rounded-lg text-xs">
              <Sparkles className={clsx('w-3.5 h-3.5', color)} />
              <span className={clsx('font-semibold', color)}>{label}</span>
            </div>
          );
        })()}

        {/* AI Copilot button */}
        <button
          onClick={() => setAIDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors shadow-md shadow-primary-500/10"
        >
          <Bot className="w-4 h-4" />
          AI Copilot
        </button>
      </div>
    </header>
  );
};
