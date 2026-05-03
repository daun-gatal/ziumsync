import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Radio, Zap } from 'lucide-react';
import { usePipelines, useCreatePipeline } from '../hooks/usePipelines';
import { useSourceConnections, useTargetConnections } from '../hooks/useConnections';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function SourceNode({ data }: NodeProps) {
  return (
    <div className="flow-node">
      <div className="flow-node-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Database size={11} /> Source
      </div>
      <div className="flow-node-title">{data.name as string}</div>
      <div className="flow-node-sub">{data.engine as string} · {data.host as string}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function PipelineNode({ data }: NodeProps) {
  const navigate = useNavigate();
  return (
    <div
      className="flow-node"
      style={{ cursor: 'pointer', minWidth: 200 }}
      onDoubleClick={() => navigate(`/pipelines/${data.id as string}`)}
      title="Double-click to open details"
    >
      <Handle type="target" position={Position.Left} />
      <div className="flow-node-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Zap size={11} /> Pipeline
      </div>
      <div className="flow-node-title">{data.name as string}</div>
      <div className="flow-node-sub" style={{ marginTop: 6 }}>
        <StatusBadge status={data.status as 'STOPPED' | 'RUNNING' | 'DEPLOYING' | 'FAILED'} />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function TargetNode({ data }: NodeProps) {
  return (
    <div className="flow-node">
      <Handle type="target" position={Position.Left} />
      <div className="flow-node-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Radio size={11} /> Target
      </div>
      <div className="flow-node-title">{data.name as string}</div>
      <div className="flow-node-sub">{data.engine as string}</div>
    </div>
  );
}

const nodeTypes = { source: SourceNode, pipeline: PipelineNode, target: TargetNode };

// ─── Build graph from data ────────────────────────────────────────────────────

function buildGraph(pipelines: ReturnType<typeof usePipelines>['data'], sources: ReturnType<typeof useSourceConnections>['data'], targets: ReturnType<typeof useTargetConnections>['data']) {
  const nodes: Node[] = [];
  const edges: ReturnType<typeof useEdgesState>[0] = [];

  const ps = pipelines ?? [];
  const ss = sources ?? [];
  const ts = targets ?? [];

  // Unique sources used
  const usedSrcIds = [...new Set(ps.map((p) => p.source_connection_id))];
  const usedTgtIds = [...new Set(ps.map((p) => p.target_connection_id))];

  usedSrcIds.forEach((id, i) => {
    const src = ss.find((s) => s.id === id);
    if (!src) return;
    nodes.push({ id: `src-${id}`, type: 'source', position: { x: 0, y: i * 180 }, data: { name: src.name, engine: src.engine, host: src.host } });
  });

  ps.forEach((p, i) => {
    nodes.push({ id: `pl-${p.id}`, type: 'pipeline', position: { x: 280, y: i * 180 }, data: { id: p.id, name: p.name, status: p.status } });
    edges.push({ id: `e-src-${p.id}`, source: `src-${p.source_connection_id}`, target: `pl-${p.id}`, type: 'smoothstep', style: { stroke: 'var(--border)' } });
    edges.push({ id: `e-tgt-${p.id}`, source: `pl-${p.id}`, target: `tgt-${p.target_connection_id}`, type: 'smoothstep', style: { stroke: 'var(--border)' } });
  });

  usedTgtIds.forEach((id, i) => {
    const tgt = ts.find((t) => t.id === id);
    if (!tgt) return;
    nodes.push({ id: `tgt-${id}`, type: 'target', position: { x: 560, y: i * 180 }, data: { name: tgt.name, engine: tgt.engine } });
  });

  return { nodes, edges };
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PipelineBuilder() {
  const { selectedId } = useWorkspaceContext();
  const { data: pipelines = [] } = usePipelines();
  const { data: sources = [] }   = useSourceConnections();
  const { data: targets = [] }   = useTargetConnections();
  const createPipeline = useCreatePipeline();

  const wsFiltered = selectedId
    ? pipelines.filter((p) => p.workspace_id === selectedId)
    : pipelines;

  const { nodes: initNodes, edges: initEdges } = buildGraph(wsFiltered, sources, targets);
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), []);

  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', source_connection_id: '', target_connection_id: '' });

  const srcOptions = sources
    .filter((s) => !selectedId || s.workspace_id === selectedId)
    .map((s) => ({ value: s.id, label: `${s.name} (${s.engine})` }));
  const tgtOptions = targets
    .filter((t) => !selectedId || t.workspace_id === selectedId)
    .map((t) => ({ value: t.id, label: `${t.name} (${t.engine})` }));

  function handleCreate() {
    if (!form.name || !form.source_connection_id || !form.target_connection_id || !selectedId) return;
    createPipeline.mutate(
      { workspace_id: selectedId, ...form },
      { onSuccess: (data) => { 
          setCreateOpen(false); 
          setForm({ name: '', source_connection_id: '', target_connection_id: '' });
          navigate(`/pipelines/${data.id}`);
        } 
      }
    );
  }

  return (
    <div className="builder-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Pipeline Builder</h1>
          <p>Visual overview of all CDC pipelines. Double-click a pipeline node to open details.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!selectedId}>
          New Pipeline
        </Button>
      </div>

      <div className="builder-wrap">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border)" gap={24} />
          <Controls />
        </ReactFlow>
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Pipeline"
        description="Link a source database to a target broker."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              loading={createPipeline.isPending}
              disabled={!form.name || !form.source_connection_id || !form.target_connection_id || !selectedId}
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          id="pl-name"
          label="Pipeline Name"
          placeholder="e.g. prod-users-cdc"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Select
          id="pl-source"
          label="Source Connection"
          value={form.source_connection_id}
          onChange={(e) => setForm((f) => ({ ...f, source_connection_id: e.target.value }))}
          options={[{ value: '', label: 'Select a Source...' }, ...srcOptions]}
        />
        <Select
          id="pl-target"
          label="Target Connection"
          value={form.target_connection_id}
          onChange={(e) => setForm((f) => ({ ...f, target_connection_id: e.target.value }))}
          options={[{ value: '', label: 'Select a Target...' }, ...tgtOptions]}
        />
      </Dialog>
    </div>
  );
}
