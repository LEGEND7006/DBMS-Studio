import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Database, Table, Clock, Trash2, Edit2, Copy, MoreVertical,
  FolderOpen
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Modal, EmptyState, LoadingSpinner } from '../components/UI';
import { projectsAPI } from '../services/api';
import { useProjectsStore, useToastStore } from '../store';
import { Project, DBType } from '../types';
import { clsx } from 'clsx';

const dbTypeOptions: { value: DBType; label: string; color: string }[] = [
  { value: 'mysql', label: 'MySQL', color: 'text-orange-400' },
  { value: 'postgresql', label: 'PostgreSQL', color: 'text-blue-400' },
  { value: 'sqlite', label: 'SQLite', color: 'text-cyan-400' },
  { value: 'sqlserver', label: 'SQL Server', color: 'text-red-400' },
  { value: 'oracle', label: 'Oracle', color: 'text-yellow-400' },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, setProjects, addProject, deleteProject, setActiveProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', db_type: 'mysql' as DBType });
  const [creating, setCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.projects);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    setCreating(true);
    try {
      const res = await projectsAPI.create(newProject);
      addProject(res.data.project);
      addToast({ type: 'success', message: `Project "${newProject.name}" created!` });
      setShowCreate(false);
      setNewProject({ name: '', description: '', db_type: 'mysql' });
    } catch {
      addToast({ type: 'error', message: 'Failed to create project' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectsAPI.delete(project.id);
      deleteProject(project.id);
      addToast({ type: 'success', message: 'Project deleted' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete project' });
    }
    setContextMenu(null);
  };

  const openProject = (project: Project) => {
    setActiveProject(project);
    navigate('/designer');
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar
        title="Projects"
        subtitle="Manage your database projects"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="input pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <LoadingSpinner message="Loading projects..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={searchTerm ? 'No matching projects' : 'No projects yet'}
            description={
              searchTerm
                ? 'Try adjusting your search terms.'
                : 'Create your first schema and let AI help you design it.'
            }
            action={
              !searchTerm && (
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                  <Plus className="w-4 h-4" /> Create Project
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div key={project.id} className="card-hover p-5 group relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className={clsx('w-4 h-4', dbTypeOptions.find(d => d.value === project.db_type)?.color)} />
                    <span className={clsx('text-xs font-mono uppercase', dbTypeOptions.find(d => d.value === project.db_type)?.color)}>
                      {project.db_type}
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setContextMenu(contextMenu === project.id ? null : project.id)}
                      className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-300 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {contextMenu === project.id && (
                      <div className="absolute right-0 top-8 bg-dark-800 border border-dark-600 rounded-lg shadow-xl py-1 z-10 min-w-[140px] animate-fade-in">
                        <button
                          onClick={() => { openProject(project); setContextMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Open
                        </button>
                        <button
                          onClick={() => handleDelete(project)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-dark-100 mb-1">{project.name}</h3>
                <p className="text-sm text-dark-400 line-clamp-2 mb-4">{project.description || 'No description'}</p>

                <div className="flex items-center gap-4 text-xs text-dark-400 mb-4">
                  <span className="flex items-center gap-1"><Table className="w-3 h-3" /> {project.table_count || 0} tables</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>

                <button
                  onClick={() => openProject(project)}
                  className="btn-secondary text-sm w-full justify-center"
                >
                  Open Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Project Name *</label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="input"
              placeholder="e.g., E-Commerce Database"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="input min-h-[80px] resize-none"
              placeholder="Brief description of your database project..."
            />
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Database Type</label>
            <div className="grid grid-cols-3 gap-2">
              {dbTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewProject({ ...newProject, db_type: opt.value })}
                  className={clsx(
                    'p-2.5 rounded-lg border text-sm font-medium transition-all text-center',
                    newProject.db_type === opt.value
                      ? 'border-primary-500 bg-primary-900/30 text-primary-400'
                      : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleCreate} disabled={!newProject.name.trim() || creating} className="btn-primary flex-1 justify-center">
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
