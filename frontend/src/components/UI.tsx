import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../store';
import { clsx } from 'clsx';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-green-900/80 border-green-700 text-green-200',
  error: 'bg-red-900/80 border-red-700 text-red-200',
  warning: 'bg-yellow-900/80 border-yellow-700 text-yellow-200',
  info: 'bg-blue-900/80 border-blue-700 text-blue-200',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-sm animate-slide-up',
              styles[toast.type]
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ==================== MODAL ====================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl animate-slide-up', maxWidth)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-700 text-dark-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

// ==================== EMPTY STATE ====================
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-dark-500" />
    </div>
    <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
    <p className="text-sm text-dark-400 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

// ==================== LOADING STATE ====================
export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="relative w-12 h-12 mb-4">
      <div className="absolute inset-0 border-2 border-dark-700 rounded-full" />
      <div className="absolute inset-0 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
    {message && <p className="text-sm text-dark-400">{message}</p>}
  </div>
);

// ==================== SKELETON ====================
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton', className)} />
);

export const CardSkeleton: React.FC = () => (
  <div className="card p-4 space-y-3">
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

// ==================== SCORE GAUGE ====================
interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, size = 'md' }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#3b82f6' : score >= 50 ? '#eab308' : '#ef4444';
  const sizeMap = { sm: 'w-20 h-20', md: 'w-32 h-32', lg: 'w-40 h-40' };
  const textSize = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };

  return (
    <div className="flex flex-col items-center">
      <div className={clsx('relative', sizeMap[size])}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('font-bold', textSize[size])} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-sm text-dark-400 mt-2 font-medium">{label}</span>
    </div>
  );
};

// ==================== AI THINKING INDICATOR ====================
export const AIThinking: React.FC<{ message?: string }> = ({ message = 'AI is thinking...' }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-primary-900/20 border border-primary-800/30 rounded-lg">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
      <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
      <div className="w-2 h-2 bg-primary-400 rounded-full typing-dot" />
    </div>
    <span className="text-sm text-primary-300">{message}</span>
  </div>
);

// ==================== SEVERITY BADGE ====================
export const SeverityBadge: React.FC<{ severity: 'critical' | 'warning' | 'info' }> = ({ severity }) => {
  const map = {
    critical: { cls: 'badge-red', label: '🔴 Critical' },
    warning: { cls: 'badge-yellow', label: '🟡 Warning' },
    info: { cls: 'badge-blue', label: '🔵 Info' },
  };
  return <span className={map[severity].cls}>{map[severity].label}</span>;
};
