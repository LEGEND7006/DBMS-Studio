import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  Node, Edge, Connection, addEdge, useNodesState, useEdgesState,
  Handle, Position, NodeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Plus, Download, Code2, ZoomIn, Key, Hash, Type, Link2, Trash2,
  Save, X, ChevronDown, Database, AlertCircle
} from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Modal, EmptyState, LoadingSpinner } from '../components/UI';
import { projectsAPI, tablesAPI, relationshipsAPI } from '../services/api';
import { useProjectsStore, useToastStore } from '../store';
import { DBTable, Column, Relationship } from '../types';
import { clsx } from 'clsx';

// ==================== TABLE NODE COMPONENT ====================
const TableNode: React.FC<NodeProps> = ({ data, selected }) => {
  const columns: Column[] = data.columns || [];
  return (
    <div className={clsx(
      'er-node transition-all duration-200',
      selected ? 'border-primary-500 shadow-lg shadow-primary-900/30' : ''
    )}>
      <Handle type="target" position={Position.Left} className="!bg-primary-500 !w-2.5 !h-2.5 !border-2 !border-dark-900" />
      <div className="er-node-header flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-primary-300 font-mono text-xs uppercase tracking-wider">{data.label}</span>
      </div>
      <div className="divide-y divide-dark-700/50">
        {columns.map((col) => (
          <div key={col.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-dark-700/30 transition-colors">
            {col.is_pk ? <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" /> :
              col.is_unique ? <Hash className="w-3 h-3 text-blue-400 flex-shrink-0" /> :
                <Type className="w-3 h-3 text-dark-500 flex-shrink-0" />}
            <span className="text-dark-200 font-mono">{col.name}</span>
            <span className="text-dark-500 ml-auto font-mono text-[10px]">{col.data_type}</span>
            {col.is_pk ? <span className="badge-yellow text-[9px] py-0 px-1">PK</span> : null}
            {col.name.endsWith('_id') && !col.is_pk ? <Link2 className="w-2.5 h-2.5 text-primary-500" /> : null}
          </div>
        ))}
        {columns.length === 0 && (
          <div className="px-3 py-2 text-xs text-dark-500 italic">No columns</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary-500 !w-2.5 !h-2.5 !border-2 !border-dark-900" />
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

// ==================== DATABASE DESIGNER PAGE ====================
export const DatabaseDesignerPage: React.FC = () => {
  const { activeProject, setActiveProject } = useProjectsStore();
  const { addToast } = useToastStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tables, setTables] = useState<DBTable[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showGenerateSQL, setShowGenerateSQL] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [editingColumns, setEditingColumns] = useState<Column[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(!activeProject);

  useEffect(() => {
    if (activeProject) {
      loadSchema();
    }
  }, [activeProject?.id]);

  const loadSchema = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await projectsAPI.getSchema(activeProject.id);
      const loadedTables: DBTable[] = res.data.tables;
      const loadedRels: Relationship[] = res.data.relationships || [];
      setTables(loadedTables);
      setRelationships(loadedRels);

      // Convert tables to React Flow nodes
      const flowNodes: Node[] = loadedTables.map((t) => ({
        id: t.id,
        type: 'tableNode',
        position: { x: t.position_x, y: t.position_y },
        data: { label: t.name, columns: t.columns, tableId: t.id },
      }));
      setNodes(flowNodes);

      // Convert relationships to React Flow edges
      const flowEdges: Edge[] = loadedRels.map((r) => ({
        id: r.id,
        source: r.source_table_id,
        target: r.target_table_id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        label: r.rel_type.replace('_', ' to '),
        labelStyle: { fill: '#94a3b8', fontSize: 10 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      }));
      setEdges(flowEdges);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to load schema' });
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(async (connection: Connection) => {
    if (!activeProject || !connection.source || !connection.target) return;
    try {
      // Find FK columns
      const sourceTable = tables.find(t => t.id === connection.source);
      const targetTable = tables.find(t => t.id === connection.target);
      if (!sourceTable || !targetTable) return;

      const sourceCol = sourceTable.columns.find(c => c.is_pk) || sourceTable.columns[0];
      const targetCol = targetTable.columns.find(c => c.name.endsWith('_id')) || targetTable.columns.find(c => c.is_pk) || targetTable.columns[0];

      const res = await relationshipsAPI.create({
        project_id: activeProject.id,
        source_table_id: connection.source,
        source_column_id: sourceCol?.id,
        target_table_id: connection.target,
        target_column_id: targetCol?.id,
        rel_type: 'one_to_many',
      });

      setEdges((eds) => addEdge({
        ...connection,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#22c55e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        id: res.data.relationship.id,
      }, eds));

      addToast({ type: 'success', message: 'Relationship created' });
    } catch {
      addToast({ type: 'error', message: 'Failed to create relationship' });
    }
  }, [activeProject, tables]);

  const onNodeDragStop = useCallback(async (_event: any, node: Node) => {
    try {
      await tablesAPI.update(node.id, {
        position_x: node.position.x,
        position_y: node.position.y,
      });
    } catch {
      // silent
    }
  }, []);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    const table = tables.find((t) => t.id === node.id);
    if (table) {
      setSelectedTable(table);
      setEditingColumns([...table.columns]);
    }
  }, [tables]);

  const handleAddTable = async () => {
    if (!newTableName.trim() || !activeProject) return;
    try {
      const res = await projectsAPI.addTable(activeProject.id, {
        name: newTableName.toLowerCase().replace(/\s+/g, '_'),
        position_x: 100 + Math.random() * 400,
        position_y: 100 + Math.random() * 300,
      });
      const newTable: DBTable = res.data.table;
      setTables((prev) => [...prev, newTable]);
      setNodes((prev) => [
        ...prev,
        {
          id: newTable.id,
          type: 'tableNode',
          position: { x: newTable.position_x, y: newTable.position_y },
          data: { label: newTable.name, columns: newTable.columns, tableId: newTable.id },
        },
      ]);
      setShowAddTable(false);
      setNewTableName('');
      addToast({ type: 'success', message: `Table "${newTable.name}" created` });
    } catch {
      addToast({ type: 'error', message: 'Failed to create table' });
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable) return;
    if (!window.confirm(`Delete table "${selectedTable.name}"?`)) return;
    try {
      await tablesAPI.delete(selectedTable.id);
      setTables((prev) => prev.filter((t) => t.id !== selectedTable.id));
      setNodes((prev) => prev.filter((n) => n.id !== selectedTable.id));
      setEdges((prev) => prev.filter((e) => e.source !== selectedTable.id && e.target !== selectedTable.id));
      setSelectedTable(null);
      addToast({ type: 'success', message: 'Table deleted' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete table' });
    }
  };

  const handleSaveColumns = async () => {
    if (!selectedTable) return;
    try {
      await tablesAPI.saveColumns(selectedTable.id, editingColumns.map((c, idx) => ({
        ...c,
        order_index: idx,
      })));
      // Update local state
      setTables((prev) => prev.map((t) => t.id === selectedTable.id ? { ...t, columns: editingColumns } : t));
      // Update node data
      setNodes((prev) => prev.map((n) => n.id === selectedTable.id ? { ...n, data: { ...n.data, columns: editingColumns } } : n));
      addToast({ type: 'success', message: 'Columns saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save columns' });
    }
  };

  const addColumn = () => {
    setEditingColumns((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        table_id: selectedTable?.id || '',
        name: '',
        data_type: 'VARCHAR(255)',
        nullable: 1,
        default_val: null,
        is_pk: 0,
        is_unique: 0,
        auto_increment: 0,
        order_index: prev.length,
      },
    ]);
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    setEditingColumns((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeColumn = (index: number) => {
    setEditingColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const generateSQL = () => {
    const dbType = activeProject?.db_type || 'mysql';
    let sql = '';
    for (const table of tables) {
      sql += `CREATE TABLE ${table.name} (\n`;
      const colDefs: string[] = [];
      const pks: string[] = [];
      for (const col of table.columns) {
        let def = `    ${col.name} ${col.data_type}`;
        if (col.auto_increment && dbType === 'mysql') def += ' AUTO_INCREMENT';
        if (!col.nullable) def += ' NOT NULL';
        if (col.is_unique && !col.is_pk) def += ' UNIQUE';
        if (col.default_val) def += ` DEFAULT ${col.default_val}`;
        colDefs.push(def);
        if (col.is_pk) pks.push(col.name);
      }
      if (pks.length > 0) {
        colDefs.push(`    PRIMARY KEY (${pks.join(', ')})`);
      }
      sql += colDefs.join(',\n');
      sql += `\n);\n\n`;
    }

    // Add FK constraints
    for (const rel of relationships) {
      const sourceTable = tables.find(t => t.id === rel.source_table_id);
      const targetTable = tables.find(t => t.id === rel.target_table_id);
      if (sourceTable && targetTable) {
        const sourceCol = sourceTable.columns.find(c => c.id === rel.source_column_id);
        const targetCol = targetTable.columns.find(c => c.id === rel.target_column_id);
        if (sourceCol && targetCol) {
          sql += `ALTER TABLE ${targetTable.name}\n  ADD CONSTRAINT fk_${targetTable.name}_${sourceTable.name}\n  FOREIGN KEY (${targetCol.name}) REFERENCES ${sourceTable.name}(${sourceCol.name})\n  ON DELETE ${rel.on_delete} ON UPDATE ${rel.on_update};\n\n`;
        }
      }
    }

    setGeneratedSQL(sql || '-- No tables to generate SQL from');
    setShowGenerateSQL(true);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(generatedSQL);
    addToast({ type: 'success', message: 'SQL copied to clipboard' });
  };

  // If no project selected, show picker
  if (!activeProject) {
    return (
      <div className="flex-1">
        <TopBar title="Database Designer" subtitle="Select a project to start designing" />
        <EmptyState
          icon={Database}
          title="No Project Selected"
          description="Open a project from the Projects page to start designing your database schema."
          action={
            <a href="/projects" className="btn-primary">
              <Database className="w-4 h-4" /> Go to Projects
            </a>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1">
        <TopBar title="Database Designer" />
        <LoadingSpinner message="Loading schema..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <TopBar
        title="Database Designer"
        subtitle={`${tables.length} tables · ${relationships.length} relationships`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowAddTable(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Add Table
            </button>
            <button onClick={generateSQL} className="btn-secondary text-sm">
              <Code2 className="w-4 h-4" /> Generate SQL
            </button>
          </div>
        }
      />

      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            className="bg-dark-950"
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#22c55e', strokeWidth: 2 },
            }}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor="#1e293b"
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center pointer-events-auto">
                <Database className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 mb-3">Your canvas is empty</p>
                <button onClick={() => setShowAddTable(true)} className="btn-primary">
                  <Plus className="w-4 h-4" /> Add First Table
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Table Editor */}
        {selectedTable && (
          <div className="w-80 border-l border-dark-700 bg-dark-900 overflow-y-auto animate-slide-in-right">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-dark-100 font-mono text-sm">{selectedTable.name}</h3>
                <p className="text-xs text-dark-400">{editingColumns.length} columns</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-1 rounded hover:bg-dark-700 text-dark-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Columns</h4>
              {editingColumns.map((col, idx) => (
                <div key={col.id} className="bg-dark-800 rounded-lg p-3 border border-dark-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                      className="input text-xs font-mono py-1 flex-1"
                      placeholder="column_name"
                    />
                    <button onClick={() => removeColumn(idx)} className="text-dark-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <select
                    value={col.data_type}
                    onChange={(e) => updateColumn(idx, 'data_type', e.target.value)}
                    className="select text-xs py-1"
                  >
                    {['INT', 'BIGINT', 'SERIAL', 'VARCHAR(50)', 'VARCHAR(100)', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'DECIMAL(10,2)', 'FLOAT', 'DOUBLE', 'JSON', 'BLOB'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <label className="flex items-center gap-1 text-dark-300 cursor-pointer">
                      <input type="checkbox" checked={col.is_pk === 1} onChange={(e) => updateColumn(idx, 'is_pk', e.target.checked ? 1 : 0)}
                        className="rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500" />
                      PK
                    </label>
                    <label className="flex items-center gap-1 text-dark-300 cursor-pointer">
                      <input type="checkbox" checked={col.is_unique === 1} onChange={(e) => updateColumn(idx, 'is_unique', e.target.checked ? 1 : 0)}
                        className="rounded border-dark-600 bg-dark-700" />
                      Unique
                    </label>
                    <label className="flex items-center gap-1 text-dark-300 cursor-pointer">
                      <input type="checkbox" checked={col.nullable === 1} onChange={(e) => updateColumn(idx, 'nullable', e.target.checked ? 1 : 0)}
                        className="rounded border-dark-600 bg-dark-700" />
                      Null
                    </label>
                    <label className="flex items-center gap-1 text-dark-300 cursor-pointer">
                      <input type="checkbox" checked={col.auto_increment === 1} onChange={(e) => updateColumn(idx, 'auto_increment', e.target.checked ? 1 : 0)}
                        className="rounded border-dark-600 bg-dark-700" />
                      AI
                    </label>
                  </div>
                </div>
              ))}

              <button onClick={addColumn} className="btn-secondary text-xs w-full justify-center">
                <Plus className="w-3 h-3" /> Add Column
              </button>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveColumns} className="btn-primary text-xs flex-1 justify-center">
                  <Save className="w-3 h-3" /> Save
                </button>
                <button onClick={handleDeleteTable} className="btn-danger text-xs">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      <Modal open={showAddTable} onClose={() => setShowAddTable(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Table Name</label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              className="input font-mono"
              placeholder="e.g., users"
              autoFocus
            />
            <p className="text-xs text-dark-500 mt-1">Use snake_case naming. An id column will be auto-created.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddTable(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleAddTable} disabled={!newTableName.trim()} className="btn-primary flex-1 justify-center">
              Create Table
            </button>
          </div>
        </div>
      </Modal>

      {/* Generate SQL Modal */}
      <Modal open={showGenerateSQL} onClose={() => setShowGenerateSQL(false)} title="Generated SQL" maxWidth="max-w-3xl">
        <div>
          <pre className="code-block max-h-96 overflow-y-auto text-xs">{generatedSQL}</pre>
          <div className="flex gap-3 mt-4">
            <button onClick={copySQL} className="btn-primary text-sm">
              <Code2 className="w-4 h-4" /> Copy SQL
            </button>
            <button
              onClick={() => {
                const blob = new Blob([generatedSQL], { type: 'text/sql' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeProject?.name || 'schema'}.sql`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn-secondary text-sm"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
