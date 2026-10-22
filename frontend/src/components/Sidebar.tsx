import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Database, Code2, Wand2, Zap, Search,
  Activity, History, Settings, LogOut, ChevronLeft, ChevronRight,
  Bot, User, HelpCircle, Cpu
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../store';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/designer', icon: Database, label: 'DB Designer' },
  { to: '/editor', icon: Code2, label: 'SQL Editor' },
  { to: '/ai-generator', icon: Wand2, label: 'AI SQL Generator' },
  { to: '/optimizer', icon: Zap, label: 'Query Optimizer' },
  { to: '/analyzer', icon: Search, label: 'Schema Analyzer' },
  { to: '/performance', icon: Activity, label: 'Performance' },
  { to: '/history', icon: History, label: 'Query History' },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setAIDrawerOpen } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-dark-900 border-r border-dark-700 transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-700">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight">Intelligent</p>
            <p className="text-xs text-primary-400 leading-tight">DBMS Studio</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-100 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium w-full',
                isActive
                  ? 'bg-primary-900/30 text-primary-400 border border-primary-800/30'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}

        {/* AI Copilot button */}
        <button
          onClick={() => setAIDrawerOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-900/20 border border-transparent hover:border-primary-800/30 transition-all duration-200 text-sm font-medium w-full mt-2"
        >
          <Bot className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>AI Copilot</span>}
        </button>
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-dark-700 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium w-full',
              isActive ? 'text-primary-400 bg-primary-900/20' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
            )
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-900/10 transition-all duration-200 text-sm font-medium w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>

        {/* User profile */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mt-2 bg-dark-800 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-dark-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-dark-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
