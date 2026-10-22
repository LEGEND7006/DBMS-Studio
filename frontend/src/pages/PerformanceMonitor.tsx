import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Zap, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TopBar } from '../components/TopBar';
import { ScoreGauge } from '../components/UI';
import { clsx } from 'clsx';

// Simulated performance data
const queryTimeData = [
  { time: '10:00', avgMs: 45, maxMs: 120 },
  { time: '10:05', avgMs: 52, maxMs: 180 },
  { time: '10:10', avgMs: 38, maxMs: 95 },
  { time: '10:15', avgMs: 67, maxMs: 250 },
  { time: '10:20', avgMs: 43, maxMs: 110 },
  { time: '10:25', avgMs: 55, maxMs: 200 },
  { time: '10:30', avgMs: 31, maxMs: 85 },
  { time: '10:35', avgMs: 48, maxMs: 140 },
  { time: '10:40', avgMs: 62, maxMs: 310 },
  { time: '10:45', avgMs: 35, maxMs: 90 },
  { time: '10:50', avgMs: 41, maxMs: 105 },
  { time: '10:55', avgMs: 28, maxMs: 72 },
];

const queriesPerMinute = [
  { time: '10:00', count: 12 },
  { time: '10:05', count: 18 },
  { time: '10:10', count: 8 },
  { time: '10:15', count: 24 },
  { time: '10:20', count: 15 },
  { time: '10:25', count: 20 },
  { time: '10:30', count: 10 },
  { time: '10:35', count: 16 },
  { time: '10:40', count: 22 },
  { time: '10:45', count: 14 },
  { time: '10:50', count: 19 },
  { time: '10:55', count: 11 },
];

const slowQueries = [
  { query: 'SELECT * FROM orders WHERE customer_id IN (SELECT...)', time: '2.84s', frequency: 45, severity: 'critical' as const, optimized: false },
  { query: 'SELECT p.*, c.name FROM products p JOIN categories...', time: '1.42s', frequency: 23, severity: 'warning' as const, optimized: false },
  { query: 'SELECT COUNT(*) FROM order_items GROUP BY product_id', time: '0.89s', frequency: 67, severity: 'warning' as const, optimized: true },
  { query: 'SELECT u.name, SUM(o.total) FROM users u JOIN...', time: '0.56s', frequency: 12, severity: 'info' as const, optimized: true },
];

const queryTypeData = [
  { name: 'SELECT', value: 68, color: '#22c55e' },
  { name: 'INSERT', value: 18, color: '#3b82f6' },
  { name: 'UPDATE', value: 10, color: '#eab308' },
  { name: 'DELETE', value: 4, color: '#ef4444' },
];

export const PerformanceMonitorPage: React.FC = () => {
  const [metrics] = useState({
    avgExecTime: '47ms',
    slowQueries: 4,
    totalExecuted: 1247,
    failedQueries: 3,
    indexUsage: '78%',
    dbLoad: 'Low',
  });

  const metricCards = [
    { label: 'Avg Execution Time', value: metrics.avgExecTime, icon: Clock, color: 'text-primary-400', bg: 'bg-primary-900/30' },
    { label: 'Slow Queries', value: metrics.slowQueries, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    { label: 'Total Executed', value: metrics.totalExecuted.toLocaleString(), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: 'Failed Queries', value: metrics.failedQueries, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/30' },
    { label: 'Index Usage', value: metrics.indexUsage, icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
    { label: 'Database Load', value: metrics.dbLoad, icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-900/30' },
  ];

  const tooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' },
    labelStyle: { color: '#94a3b8' },
    itemStyle: { color: '#e2e8f0' },
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <TopBar title="Performance Monitor" subtitle="Query execution metrics and performance analytics (simulated)" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricCards.map((m) => (
            <div key={m.label} className="card p-4">
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', m.bg)}>
                <m.icon className={clsx('w-4 h-4', m.color)} />
              </div>
              <p className="text-lg font-bold text-dark-100">{m.value}</p>
              <p className="text-xs text-dark-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query execution time */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Query Execution Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={queryTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="maxMs" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Max (ms)" />
                <Area type="monotone" dataKey="avgMs" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Avg (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Queries per minute */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Queries per Minute</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={queriesPerMinute}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Queries" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Query type distribution */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Query Type Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={queryTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {queryTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                  formatter={(value) => <span className="text-dark-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance health */}
          <div className="card p-6 flex items-center justify-center">
            <ScoreGauge score={84} label="Performance Health" size="lg" />
          </div>
        </div>

        {/* Slow queries table */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-dark-200 mb-4">Slow Queries</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Execution Time</th>
                  <th>Frequency</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((q, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs max-w-xs truncate">{q.query}</td>
                    <td className="text-yellow-400 font-mono text-xs">{q.time}</td>
                    <td>{q.frequency}x/hr</td>
                    <td>
                      <span className={clsx(
                        'badge',
                        q.severity === 'critical' ? 'badge-red' :
                        q.severity === 'warning' ? 'badge-yellow' : 'badge-blue'
                      )}>
                        {q.severity}
                      </span>
                    </td>
                    <td>
                      {q.optimized ? (
                        <span className="badge-green"><CheckCircle className="w-3 h-3" /> Optimized</span>
                      ) : (
                        <span className="badge-yellow">Needs Optimization</span>
                      )}
                    </td>
                    <td>
                      {!q.optimized && (
                        <a href="/optimizer" className="btn-ghost text-xs text-primary-400">
                          <Zap className="w-3 h-3" /> Optimize
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
