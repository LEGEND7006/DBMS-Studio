import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Search, Trash2, Copy, Play, Zap, Clock, CheckCircle,
  AlertCircle, Database, Filter, ArrowUpRight
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { EmptyState, LoadingSpinner } from '../components/UI';
import { queriesAPI } from '../services/api';
import { useProjectsStore, useToastStore } from '../store';
import { Query } from '../types';
import { clsx } from 'clsx';

export const QueryHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sql_editor' | 'ai_generated' | 'manual'>('all');

  useEffect(() => {
    loadHistory();
  }, [activeProject]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await queriesAPI.history({
        projectId: activeProject?.id,
        search: searchTerm,
      });
      setQueries(res.data.queries || []);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to load query history' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const handleCopy = (sql: string) => {
    navigator.clipboard.writeText(sql);
    addToast({ type: 'success', message: 'Query copied to clipboard' });
  };

  const handleDelete = async (id: string) => {
    try {
      await queriesAPI.delete(id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
      addToast({ type: 'success', message: 'Query removed from history' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete query' });
    }
  };

  const handleOpenInEditor = (sql: string) => {
    // Navigate to editor with query in state
    navigate('/editor', { state: { sql } });
  };

  const filteredQueries = queries.filter((q) => {
    if (sourceFilter !== 'all' && q.source !== sourceFilter) return false;
    if (searchTerm) {
      return q.sql_text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'ai_generated':
        return <span className="badge-green">✨ AI Generated</span>;
      case 'sql_editor':
        return <span className="badge-blue">💻 IDE Execution</span>;
      default:
        return <span className="badge-gray">📝 Manual</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar
        title="Query History"
        subtitle={activeProject ? `Queries for ${activeProject.name}` : 'All previously executed queries'}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in query history..."
              className="input pl-10 text-sm"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-dark-400" />
            <span className="text-xs text-dark-400 font-medium mr-1">Source:</span>
            {(['all', 'sql_editor', 'ai_generated', 'manual'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                  sourceFilter === s
                    ? 'bg-primary-900/40 text-primary-400 border border-primary-800/50'
                    : 'bg-dark-800 text-dark-400 hover:text-dark-200 border border-dark-700'
                )}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Query Table */}
        {loading ? (
          <LoadingSpinner message="Loading query history..." />
        ) : filteredQueries.length === 0 ? (
          <EmptyState
            icon={History}
            title={searchTerm ? 'No matching queries found' : 'No query history yet'}
            description="Run queries in the SQL Editor or AI Generator to populate your execution history."
            action={
              <button onClick={() => navigate('/editor')} className="btn-primary">
                <Play className="w-4 h-4" /> Open SQL Editor
              </button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-1/2">SQL Statement</th>
                    <th>Source</th>
                    <th>Rows</th>
                    <th>Exec Time</th>
                    <th>Timestamp</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueries.map((q) => (
                    <tr key={q.id} className="group hover:bg-dark-800/40">
                      <td className="font-mono text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-dark-200 max-h-16 overflow-hidden text-ellipsis line-clamp-2 block select-all">
                            {q.sql_text}
                          </span>
                        </div>
                      </td>
                      <td>{getSourceBadge(q.source)}</td>
                      <td>
                        <span className="text-xs font-mono text-dark-300">
                          {q.rows_returned !== undefined ? `${q.rows_returned} rows` : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-primary-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {q.exec_time_ms ? `${q.exec_time_ms} ms` : '< 1 ms'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-dark-400">
                          {new Date(q.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopy(q.sql_text)}
                            title="Copy SQL"
                            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenInEditor(q.sql_text)}
                            title="Open in Editor"
                            className="p-1.5 rounded hover:bg-dark-700 text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-dark-700 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
