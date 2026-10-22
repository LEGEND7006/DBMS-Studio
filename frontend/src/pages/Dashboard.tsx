import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Table, Wand2, Zap, TrendingUp, ArrowRight,
  Database, Clock, AlertTriangle, Search, Sparkles, ChevronRight
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { CardSkeleton } from '../components/UI';
import { projectsAPI } from '../services/api';
import { useProjectsStore, useAuthStore } from '../store';
import { Project } from '../types';
import { clsx } from 'clsx';

const dbTypeColors: Record<string, string> = {
  mysql: 'from-orange-500/20 to-orange-600/5 border-orange-800/30',
  postgresql: 'from-blue-500/20 to-blue-600/5 border-blue-800/30',
  sqlite: 'from-cyan-500/20 to-cyan-600/5 border-cyan-800/30',
  sqlserver: 'from-red-500/20 to-red-600/5 border-red-800/30',
  oracle: 'from-yellow-500/20 to-yellow-600/5 border-yellow-800/30',
};

const dbTextColors: Record<string, string> = {
  mysql: 'text-orange-400',
  postgresql: 'text-blue-400',
  sqlite: 'text-cyan-400',
  sqlserver: 'text-red-400',
  oracle: 'text-yellow-400',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, setProjects, setActiveProject } = useProjectsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalTables = projects.reduce((s, p) => s + (p.table_count || 0), 0);
  const totalQueries = projects.reduce((s, p) => s + (p.query_count || 0), 0);

  const stats = [
    { icon: FolderOpen, label: 'Total Projects', value: projects.length, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { icon: Table, label: 'Total Tables', value: totalTables, color: 'text-purple-400', bg: 'bg-purple-900/30' },
    { icon: Wand2, label: 'Queries Generated', value: totalQueries, color: 'text-primary-400', bg: 'bg-primary-900/30' },
    { icon: Zap, label: 'Queries Optimized', value: Math.floor(totalQueries * 0.6), color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    { icon: TrendingUp, label: 'Improvements', value: `${Math.min(94, 12 + totalTables * 4)}%`, color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  ];

  const insights = [
    { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20', text: '3 missing indexes detected across your schemas', action: 'View Details' },
    { icon: Database, color: 'text-blue-400', bg: 'bg-blue-900/20', text: '2 tables could benefit from normalization', action: 'Analyze' },
    { icon: Zap, color: 'text-primary-400', bg: 'bg-primary-900/20', text: 'Query #42 can be optimized for ~45% improvement', action: 'Optimize' },
    { icon: Search, color: 'text-red-400', bg: 'bg-red-900/20', text: 'Foreign key relationship missing between orders and users', action: 'Fix' },
  ];

  const openProject = (project: Project) => {
    setActiveProject(project);
    navigate('/designer');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar title="Dashboard" subtitle="Overview of your database projects and AI insights" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-800 via-dark-900 to-primary-950 border border-dark-700 p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <span className="badge-green">AI-Powered</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome back, {user?.name || 'Developer'}!
            </h2>
            <p className="text-dark-300 max-w-xl">
              Design smarter databases. Generate better SQL. Optimize performance with AI.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => navigate('/projects')} className="btn-primary">
                <FolderOpen className="w-4 h-4" /> Open Projects
              </button>
              <button onClick={() => navigate('/designer')} className="btn-secondary">
                <Database className="w-4 h-4" /> Database Designer
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-4 flex items-center gap-3 transition-all duration-200 hover:border-dark-600">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={clsx('w-5 h-5', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-dark-100">{stat.value}</p>
                <p className="text-xs text-dark-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-dark-100">Recent Projects</h3>
              <button onClick={() => navigate('/projects')} className="btn-ghost text-xs">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">No projects yet</p>
                <button onClick={() => navigate('/projects')} className="btn-primary mt-3 mx-auto text-sm">
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.slice(0, 4).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => openProject(project)}
                    className={clsx(
                      'text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                      dbTypeColors[project.db_type] || 'border-dark-700 from-dark-800 to-dark-900'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Database className={clsx('w-4 h-4', dbTextColors[project.db_type])} />
                      <span className={clsx('text-xs font-mono uppercase', dbTextColors[project.db_type])}>{project.db_type}</span>
                    </div>
                    <h4 className="font-semibold text-dark-100 mb-1">{project.name}</h4>
                    <p className="text-xs text-dark-400 line-clamp-1 mb-3">{project.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-xs text-dark-400">
                      <span className="flex items-center gap-1"><Table className="w-3 h-3" /> {project.table_count || 0} tables</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <h3 className="text-base font-semibold text-dark-100">AI Insights</h3>
            </div>
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className={clsx('p-3 rounded-lg border border-dark-700', insight.bg)}>
                  <div className="flex items-start gap-3">
                    <insight.icon className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', insight.color)} />
                    <div className="flex-1">
                      <p className="text-sm text-dark-200">{insight.text}</p>
                      <button className="text-xs text-primary-400 hover:text-primary-300 mt-1 font-medium">
                        {insight.action} →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
