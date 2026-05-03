import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import {
  useSourceConnections, useCreateSourceConnection, useUpdateSourceConnection, useDeleteSourceConnection,
  useTargetConnections, useCreateTargetConnection, useDeleteTargetConnection,
} from '../hooks/useConnections';
import { useCredentials } from '../hooks/useCredentials';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Dialog, SlideOver } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingRow } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import type {
  SourceConnection,
  CreateSourceConnectionPayload, CreateTargetConnectionPayload,
  SourceEngine
} from '../lib/types';

type Tab = 'source' | 'target';

// ─── Source ──────────────────────────────────────────────────────────────────

function SourceTab() {
  const { selectedId } = useWorkspaceContext();
  const { data: conns = [], isLoading } = useSourceConnections();
  const { data: creds = [] } = useCredentials();
  const create = useCreateSourceConnection();
  const update = useUpdateSourceConnection();
  const remove = useDeleteSourceConnection();

  const [createOpen, setCreateOpen] = useState(false);
  const [editConn, setEditConn] = useState<SourceConnection | null>(null);

  const filtered = selectedId ? conns.filter((c) => c.workspace_id === selectedId) : conns;
  const credOptions = creds
    .filter((c) => !selectedId || c.workspace_id === selectedId)
    .map((c) => ({ value: c.id, label: c.name }));

  const blankForm: CreateSourceConnectionPayload = {
    workspace_id: selectedId ?? '',
    name: '',
    engine: 'POSTGRESQL',
    host: '',
    port: 5432,
    database_name: '',
    engine_config: {},
    credential_id: credOptions[0]?.value ?? '',
  };
  const [form, setForm] = useState<CreateSourceConnectionPayload>(blankForm);

  function handleCreate() {
    create.mutate(form, { onSuccess: () => setCreateOpen(false) });
  }

  function handleUpdate() {
    if (!editConn) return;
    update.mutate(
      { id: editConn.id, data: { name: editConn.name, host: editConn.host, port: editConn.port, database_name: editConn.database_name } },
      { onSuccess: () => setEditConn(null) }
    );
  }

  if (isLoading) return <LoadingRow />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button
          size="sm"
          onClick={() => { setForm({ ...blankForm, workspace_id: selectedId ?? '' }); setCreateOpen(true); }}
          disabled={!selectedId}
        >
          Add Source
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No source connections" description="Connect a PostgreSQL or MySQL database as a CDC source." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Engine</th><th>Host</th><th>Database</th><th>Credential</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const credName = creds.find((cr) => cr.id === c.credential_id)?.name ?? c.credential_id.slice(0, 8);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><Badge variant="accent">{c.engine}</Badge></td>
                    <td className="td-mono">{c.host}:{c.port}</td>
                    <td className="td-mono">{c.database_name}</td>
                    <td className="td-muted">{credName}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" title="Edit" onClick={() => setEditConn(c)}><Pencil /></button>
                        <button className="btn-icon" title="Delete" onClick={() => {
                          if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id);
                        }}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Source Connection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={create.isPending} disabled={!form.name || !form.host || !form.database_name}>Save</Button>
          </>
        }
      >
        <Input id="src-name" label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Select id="src-engine" label="Engine" value={form.engine}
          onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value as SourceEngine }))}
          options={[{ value: 'POSTGRESQL', label: 'PostgreSQL' }, { value: 'MYSQL', label: 'MySQL' }]}
        />
        <Input id="src-host" label="Host" placeholder="localhost" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
        <Input id="src-port" label="Port" type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} />
        <Input id="src-db" label="Database Name" value={form.database_name} onChange={(e) => setForm((f) => ({ ...f, database_name: e.target.value }))} />
        <Select id="src-cred" label="Credential" value={form.credential_id}
          onChange={(e) => setForm((f) => ({ ...f, credential_id: e.target.value }))}
          options={credOptions.length ? credOptions : [{ value: '', label: '— no credentials —' }]}
        />
      </Dialog>

      {/* Edit slideover */}
      <SlideOver
        open={!!editConn}
        onClose={() => setEditConn(null)}
        title="Edit Source Connection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditConn(null)}>Cancel</Button>
            <Button onClick={handleUpdate} loading={update.isPending}>Save Changes</Button>
          </>
        }
      >
        {editConn && (
          <>
            <Input id="edit-src-name" label="Name" value={editConn.name} onChange={(e) => setEditConn((c) => c && ({ ...c, name: e.target.value }))} />
            <Input id="edit-src-host" label="Host" value={editConn.host} onChange={(e) => setEditConn((c) => c && ({ ...c, host: e.target.value }))} />
            <Input id="edit-src-port" label="Port" type="number" value={editConn.port} onChange={(e) => setEditConn((c) => c && ({ ...c, port: Number(e.target.value) }))} />
            <Input id="edit-src-db" label="Database" value={editConn.database_name} onChange={(e) => setEditConn((c) => c && ({ ...c, database_name: e.target.value }))} />
          </>
        )}
      </SlideOver>
    </>
  );
}

// ─── Target ──────────────────────────────────────────────────────────────────

function TargetTab() {
  const { selectedId } = useWorkspaceContext();
  const { data: conns = [], isLoading } = useTargetConnections();
  const { data: creds = [] } = useCredentials();
  const create = useCreateTargetConnection();
  const remove = useDeleteTargetConnection();

  const [createOpen, setCreateOpen] = useState(false);
  const filtered = selectedId ? conns.filter((c) => c.workspace_id === selectedId) : conns;
  const credOptions = creds
    .filter((c) => !selectedId || c.workspace_id === selectedId)
    .map((c) => ({ value: c.id, label: c.name }));

  const blankForm: CreateTargetConnectionPayload = {
    workspace_id: selectedId ?? '',
    name: '',
    engine: 'KAFKA',
    engine_config: { 'bootstrap.servers': '' },
    credential_id: credOptions[0]?.value ?? '',
  };
  const [form, setForm] = useState<CreateTargetConnectionPayload>(blankForm);

  if (isLoading) return <LoadingRow />;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button size="sm" onClick={() => { setForm({ ...blankForm, workspace_id: selectedId ?? '' }); setCreateOpen(true); }} disabled={!selectedId}>
          Add Target
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No target connections" description="Connect Kafka as a CDC target." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Engine</th><th>Bootstrap Servers</th><th>Credential</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const credName = creds.find((cr) => cr.id === c.credential_id)?.name ?? c.credential_id.slice(0, 8);
                const bootstrap = (c.engine_config['bootstrap.servers'] as string) ?? '—';
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><Badge variant="accent">{c.engine}</Badge></td>
                    <td className="td-mono">{bootstrap}</td>
                    <td className="td-muted">{credName}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon" onClick={() => {
                          if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id);
                        }}><Trash2 /></button>
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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Target Connection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(form, { onSuccess: () => setCreateOpen(false) })} loading={create.isPending} disabled={!form.name}>Save</Button>
          </>
        }
      >
        <Input id="tgt-name" label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="form-group">
          <label>Engine</label>
          <input className="input" disabled value="KAFKA" />
        </div>
        <Input id="tgt-bootstrap" label="Bootstrap Servers"
          placeholder="broker:9092"
          value={(form.engine_config['bootstrap.servers'] as string) ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, engine_config: { ...f.engine_config, 'bootstrap.servers': e.target.value } }))}
        />
        <Select id="tgt-cred" label="Credential" value={form.credential_id}
          onChange={(e) => setForm((f) => ({ ...f, credential_id: e.target.value }))}
          options={credOptions.length ? credOptions : [{ value: '', label: '— no credentials —' }]}
        />
      </Dialog>
    </>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export default function Connections() {
  const [tab, setTab] = useState<Tab>('source');

  return (
    <div className="page">
      <PageHeader title="Connections" description="Source databases and target message brokers" />

      <div className="tabs">
        <button className={`tab${tab === 'source' ? ' active' : ''}`} onClick={() => setTab('source')}>Source</button>
        <button className={`tab${tab === 'target' ? ' active' : ''}`} onClick={() => setTab('target')}>Target</button>
      </div>

      {tab === 'source' ? <SourceTab /> : <TargetTab />}
    </div>
  );
}
