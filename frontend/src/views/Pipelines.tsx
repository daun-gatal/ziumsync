import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Play, FileCode, Eye, Square } from 'lucide-react';
import { usePipelines, useDeletePipeline, useDeployPipeline, useCompilePipeline, useCreatePipeline, useStopPipeline } from '../hooks/usePipelines';
import { useSourceConnections } from '../hooks/useConnections';
import { useTargetConnections } from '../hooks/useConnections';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingRow } from '../components/ui/Spinner';
import { CodeBlock } from '../components/ui/CodeBlock';
import { useWorkspaceContext } from '../context/WorkspaceContext';

export default function Pipelines() {
  const navigate = useNavigate();
  const { selectedId } = useWorkspaceContext();
  const { data: pipelines = [], isLoading } = usePipelines();
  const { data: sources = [] } = useSourceConnections();
  const { data: targets = [] } = useTargetConnections();

  const remove = useDeletePipeline();
  const deploy = useDeployPipeline();
  const stop = useStopPipeline();
  const compile = useCompilePipeline();

  const [compileOpen, setCompileOpen] = useState(false);
  const [compileResult, setCompileResult] = useState('');

  const filtered = selectedId
    ? pipelines.filter((p) => p.workspace_id === selectedId)
    : pipelines;

  const srcName = (id: string) => sources.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  const tgtName = (id: string) => targets.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  function handleCompile(id: string) {
    compile.mutate(id, {
      onSuccess: (data) => {
        setCompileResult(data.properties);
        setCompileOpen(true);
      },
    });
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', source_connection_id: '', target_connection_id: '' });
  const createPipeline = useCreatePipeline();

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
      {
        onSuccess: (data) => {
          setCreateOpen(false);
          setForm({ name: '', source_connection_id: '', target_connection_id: '' });
          navigate(`/pipelines/${data.id}`);
        }
      }
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Pipelines"
        description="CDC pipelines orchestrating Debezium instances"
        action={<Button onClick={() => setCreateOpen(true)} disabled={!selectedId}>New Pipeline</Button>}
      />

      {isLoading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No pipelines"
          description="Create a pipeline to start streaming changes."
          action={<Button onClick={() => setCreateOpen(true)} disabled={!selectedId}>New Pipeline</Button>}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source → Target</th>
                <th>Status</th>
                <th>Snapshot</th>
                <th>Format</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isRunning = p.status === 'RUNNING';
                const isDeploying = p.status === 'DEPLOYING';
                const isStopping = p.status === 'STOPPING';
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="td-muted">{srcName(p.source_connection_id)} → {tgtName(p.target_connection_id)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><span className="badge badge-neutral">{p.snapshot_mode}</span></td>
                    <td className="td-muted">{p.key_format}/{p.value_format}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" title="View details" onClick={() => navigate(`/pipelines/${p.id}`)}>
                          <Eye />
                        </button>
                        <button
                          className="btn-icon"
                          title="Compile config"
                          disabled={compile.isPending}
                          onClick={() => handleCompile(p.id)}
                        >
                          <FileCode />
                        </button>
                        <button
                          className="btn-icon"
                          title={p.status === 'FAILED' ? 'Retry' : 'Start'}
                          disabled={isRunning || isDeploying || isStopping}
                          onClick={() => deploy.mutate(p.id)}
                        >
                          <Play />
                        </button>
                        {isRunning && (
                          <button
                            className="btn-icon"
                            title="Stop"
                            disabled={stop.isPending}
                            onClick={() => stop.mutate(p.id)}
                          >
                            <Square size={16} fill="currentColor" />
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          title="Delete"
                          disabled={isRunning || isDeploying || isStopping}
                          onClick={() => {
                            if (confirm(`Delete pipeline "${p.name}"?`)) remove.mutate(p.id);
                          }}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={compileOpen}
        onClose={() => setCompileOpen(false)}
        title="Compiled Properties"
        description="application.properties passed to the Debezium server container"
        footer={<Button variant="ghost" onClick={() => setCompileOpen(false)}>Close</Button>}
      >
        <CodeBlock code={compileResult} />
      </Dialog>

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
