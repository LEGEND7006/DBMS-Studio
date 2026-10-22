import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, Search, Trash2, Copy, Play, Clock, CheckCircle2,
  XCircle, Filter, ArrowUpRight, Download, Activity, FileSpreadsheet,
  AlertTriangle, RefreshCw, AlertCircle
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

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
    } catch {
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

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await queriesAPI.clearHistory(activeProject?.id);
      setQueries([]);
      setShowClearConfirm(false);
      addToast({ type: 'success', message: 'Query history cleared successfully' });
    } catch {
      addToast({ type: 'error', message: 'Failed to clear query history' });
    } finally {
      setClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredQueries.length === 0) {
      addToast({ type: 'info', message: 'No queries to export' });
      return;
    }

    const headers = ['ID', 'SQL Statement', 'Status', 'Source', 'Rows Returned', 'Exec Time (ms)', 'Timestamp'];
    const csvRows = [headers.join(',')];

    for (const q of filteredQueries) {
      const escapedSql = `"${(q.sql_text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const row = [
        q.id,
        escapedSql,
        q.status || 'success',
        q.source || 'manual',
        q.rows_returned ?? 0,
        q.exec_time_ms ?? 0,
        `"${q.created_at}"`
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_history_${activeProject ? activeProject.name.toLowerCase().replace(/\s+/g, '_') : 'all'}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Query history exported to CSV' });
  };

  const handleOpenInEditor = (sql: string) => {
    navigate('/editor', { state: { sql } });
  };

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      if (sourceFilter !== 'all' && q.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && (q.status || 'success') !== statusFilter) return false;
      if (searchTerm) {
        return q.sql_text.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [queries, sourceFilter, statusFilter, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredQueries.length;
    if (total === 0) return { total: 0, successCount: 0, successRate: 100, avgTimeMs: 0 };
    const successCount = filteredQueries.filter((q) => (q.status || 'success') === 'success').length;
    const totalTime = filteredQueries.reduce((acc, q) => acc + (q.exec_time_ms || 0), 0);
    return {
      total,
      successCount,
      successRate: Math.round((successCount / total) * 100),
      avgTimeMs: (totalTime / total).toFixed(1),
    };
  }, [filteredQueries]);

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

  const getStatusBadge = (status?: string) => {
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/50">
          <XCircle className="w-3 h-3 text-red-400" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar
        title="Query History"
        subtitle={activeProject ? `Queries for ${activeProject.name}` : 'All previously executed queries'}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Quick Stats Overview */}
        {queries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400 font-medium">Total Queries</p>
                <p className="text-2xl font-bold text-dark-100 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-950/80 border border-primary-800/40 flex items-center justify-center text-primary-400">
                <History className="w-5 h-5" />
              </div>
            </div>

            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400 font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.successRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400 font-medium">Avg Execution Time</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.avgTimeMs} ms</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in query history..."
              className="input pl-10 text-sm w-full"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Source Filter */}
            <div className="flex items-center gap-1.5 bg-dark-900/60 p-1 rounded-lg border border-dark-800">
              <span className="text-xs text-dark-400 font-medium px-2">Source:</span>
              {(['all', 'sql_editor', 'ai_generated', 'manual'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                    sourceFilter === s
                      ? 'bg-primary-900/50 text-primary-300 border border-primary-700/60 shadow-sm'
                      : 'text-dark-400 hover:text-dark-200'
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-dark-900/60 p-1 rounded-lg border border-dark-800">
              <span className="text-xs text-dark-400 font-medium px-2">Status:</span>
              {(['all', 'success', 'failed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                    statusFilter === st
                      ? 'bg-primary-900/50 text-primary-300 border border-primary-700/60 shadow-sm'
                      : 'text-dark-400 hover:text-dark-200'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Actions: Export & Clear */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleExportCSV}
                title="Export queries to CSV"
                disabled={filteredQueries.length === 0}
                className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                title="Clear all history"
                disabled={queries.length === 0}
                className="btn-danger text-xs flex items-center gap-1.5 py-1.5 px-3 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            </div>
          </div>
        </div>

        {/* Clear Confirmation Modal / Banner */}
        {showClearConfirm && (
          <div className="card p-4 border-red-900/50 bg-red-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dark-100">Clear Query History?</p>
                <p className="text-xs text-dark-400 mt-0.5">
                  This will permanently delete all {activeProject ? `queries for "${activeProject.name}"` : 'logged query executions'}. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {clearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Query Table */}
        {loading ? (
          <LoadingSpinner message="Loading query history..." />
        ) : filteredQueries.length === 0 ? (
          <EmptyState
            icon={History}
            title={searchTerm || sourceFilter !== 'all' || statusFilter !== 'all' ? 'No matching queries found' : 'No query history yet'}
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
                    <th className="w-5/12">SQL Statement</th>
                    <th>Status</th>
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
                        <div className="flex flex-col gap-1">
                          <span className="text-dark-200 max-h-16 overflow-hidden text-ellipsis line-clamp-2 block select-all">
                            {q.sql_text}
                          </span>
                          {q.error_message && (
                            <span className="text-[11px] text-red-400 font-sans flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 text-red-400" />
                              {q.error_message}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{getStatusBadge(q.status)}</td>
                      <td>{getSourceBadge(q.source)}</td>
                      <td>
                        <span className="text-xs font-mono text-dark-300">
                          {q.status === 'failed' || q.status === 'error' ? '-' : `${q.rows_returned ?? 0} rows`}
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
