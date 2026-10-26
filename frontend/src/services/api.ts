import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL;
const baseURL = rawBaseUrl
  ? (rawBaseUrl.replace(/\/$/, '').endsWith('/api') ? rawBaseUrl.replace(/\/$/, '') : `${rawBaseUrl.replace(/\/$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dbms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dbms_token');
      localStorage.removeItem('dbms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

// ==================== PROJECTS ====================
export const projectsAPI = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string; db_type: string }) =>
    api.post('/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; db_type: string }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getSchema: (id: string) => api.get(`/projects/${id}/schema`),
  addTable: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/tables`, data),
};

// ==================== TABLES ====================
export const tablesAPI = {
  update: (id: string, data: any) => api.put(`/tables/${id}`, data),
  delete: (id: string) => api.delete(`/tables/${id}`),
  addColumn: (tableId: string, data: any) =>
    api.post(`/tables/${tableId}/columns`, data),
  updateColumn: (tableId: string, colId: string, data: any) =>
    api.put(`/tables/${tableId}/columns/${colId}`, data),
  deleteColumn: (tableId: string, colId: string) =>
    api.delete(`/tables/${tableId}/columns/${colId}`),
  saveColumns: (tableId: string, columns: any[]) =>
    api.put(`/tables/${tableId}/columns`, { columns }),
};

// ==================== AI ====================
export const aiAPI = {
  getConfig: () => api.get('/ai/config'),
  updateConfig: (data: any) => api.post('/ai/config', data),
  testConnection: (data?: any) => api.post('/ai/test-connection', data || {}),
  generateSQL: (prompt: string, projectId?: string) =>
    api.post('/ai/generate-sql', { prompt, projectId }),
  explainSQL: (sql: string) =>
    api.post('/ai/explain-sql', { sql }),
  optimizeSQL: (sql: string, projectId?: string) =>
    api.post('/ai/optimize-sql', { sql, projectId }),
  analyzeSchema: (projectId: string) =>
    api.post('/ai/analyze-schema', { projectId }),
  suggestIndexes: (projectId: string) =>
    api.post('/ai/suggest-indexes', { projectId }),
  applyAutofix: (data: { projectId: string; issue: any }) =>
    api.post('/ai/autofix', data),
};

// ==================== QUERIES ====================
export const queriesAPI = {
  execute: (sql: string, projectId?: string) =>
    api.post('/queries/execute', { sql, projectId }),
  history: (params?: { search?: string; projectId?: string; status?: string; limit?: number }) =>
    api.get('/queries/history', { params }),
  delete: (id: string) => api.delete(`/queries/${id}`),
  clearHistory: (projectId?: string) =>
    api.delete('/queries/history/clear', { params: { projectId } }),
};

// ==================== RELATIONSHIPS ====================
export const relationshipsAPI = {
  create: (data: any) => api.post('/relationships', data),
  delete: (id: string) => api.delete(`/relationships/${id}`),
};

export default api;
