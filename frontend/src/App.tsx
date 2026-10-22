import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useProjectsStore } from './store';
import { Sidebar } from './components/Sidebar';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { ToastContainer } from './components/UI';
import { projectsAPI, authAPI } from './services/api';

// Pages
import { DashboardPage } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { DatabaseDesignerPage } from './pages/DatabaseDesigner';
import { SQLEditorPage } from './pages/SQLEditor';
import { AIGeneratorPage } from './pages/AIGenerator';
import { QueryOptimizerPage } from './pages/QueryOptimizer';
import { SchemaAnalyzerPage } from './pages/SchemaAnalyzer';
import { PerformanceMonitorPage } from './pages/PerformanceMonitor';
import { QueryHistoryPage } from './pages/QueryHistory';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';

const MainLayout: React.FC = () => {
  const { isAuthenticated, login } = useAuthStore();
  const { setProjects, setActiveProject, activeProject } = useProjectsStore();

  // Auto-authenticate with demo user if no token is found for frictionless testing
  useEffect(() => {
    const initAuthAndProjects = async () => {
      const storedToken = localStorage.getItem('dbms_token');
      if (!storedToken && !isAuthenticated) {
        try {
          const res = await authAPI.login('demo@dbmsstudio.com', 'demo1234');
          login(res.data.user, res.data.token);
        } catch (e) {
          console.log('Demo auto-login skipped or backend initializing');
        }
      }

      try {
        const res = await projectsAPI.list();
        if (res.data?.projects?.length > 0) {
          setProjects(res.data.projects);
          if (!activeProject) {
            setActiveProject(res.data.projects[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial projects:', err);
      }
    };

    initAuthAndProjects();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-dark-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Outlet />
      </main>
      <AICopilotDrawer />
      <ToastContainer />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('dbms_token');
  const { isAuthenticated } = useAuthStore();

  // Allow through if authenticated or token exists in storage
  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/designer" element={<DatabaseDesignerPage />} />
          <Route path="/editor" element={<SQLEditorPage />} />
          <Route path="/ai-generator" element={<AIGeneratorPage />} />
          <Route path="/optimizer" element={<QueryOptimizerPage />} />
          <Route path="/analyzer" element={<SchemaAnalyzerPage />} />
          <Route path="/performance" element={<PerformanceMonitorPage />} />
          <Route path="/history" element={<QueryHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
