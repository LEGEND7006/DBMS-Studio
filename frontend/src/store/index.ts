import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Project, Toast } from '../types';

const generateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

// ==================== AUTH STORE ====================
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('dbms_token', token);
        localStorage.setItem('dbms_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('dbms_token');
        localStorage.removeItem('dbms_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'dbms_auth' }
  )
);

// ==================== PROJECTS STORE ====================
interface ProjectsStore {
  projects: Project[];
  activeProject: Project | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [],
  activeProject: null,
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      activeProject: s.activeProject?.id === id ? { ...s.activeProject, ...updates } : s.activeProject,
    })),
  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProject: s.activeProject?.id === id ? null : s.activeProject,
    })),
  setActiveProject: (project) => set({ activeProject: project }),
}));

// ==================== TOAST STORE ====================
interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ==================== UI STORE ====================
interface UIStore {
  sidebarCollapsed: boolean;
  aiDrawerOpen: boolean;
  toggleSidebar: () => void;
  setAIDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  aiDrawerOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setAIDrawerOpen: (open) => set({ aiDrawerOpen: open }),
}));

// ==================== AI STORE ====================
export interface AIState {
  provider: 'gemma4' | 'googleai' | 'openrouter' | 'demo' | 'openai' | 'gemini';
  gemmaModel: string;
  gemmaEndpoint: string;
  hasApiKey: boolean;
  thinkingMode: boolean;
  temperature: number;
  isConnected: boolean | null;
  lastPingMs: number | null;
  setAIConfig: (config: Partial<AIState>) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      provider: 'demo',
      gemmaModel: 'gemma4:31b',
      gemmaEndpoint: 'http://localhost:11434',
      hasApiKey: false,
      thinkingMode: true,
      temperature: 0.2,
      isConnected: null,
      lastPingMs: null,
      setAIConfig: (updates) => set((s) => ({ ...s, ...updates })),
    }),
    { name: 'dbms_ai_config' }
  )
);

