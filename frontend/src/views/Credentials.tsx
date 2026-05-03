import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCredentials, useCreateCredential, useDeleteCredential } from '../hooks/useCredentials';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingRow } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import type { AuthType, CreateCredentialPayload } from '../lib/types';

const AUTH_FIELDS: Record<AuthType, { key: string; label: string; secret?: boolean }[]> = {
  NONE: [],
  BASIC: [
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true },
  ],
  SASL_JAAS: [
    { key: 'sasl_mechanism', label: 'SASL Mechanism', },
    { key: 'sasl_jaas_config', label: 'JAAS Config', secret: true },
  ],
  AWS_IAM: [
    { key: 'access_key_id', label: 'Access Key ID' },
    { key: 'secret_access_key', label: 'Secret Access Key', secret: true },
    { key: 'region', label: 'AWS Region' },
  ],
};

const INITIAL_FORM: CreateCredentialPayload = {
  workspace_id: '',
  name: '',
  auth_type: 'NONE',
  encrypted_payload: {},
};

export default function Credentials() {
  const { selectedId } = useWorkspaceContext();
  const { data: credentials = [], isLoading } = useCredentials();
  const create = useCreateCredential();
  const remove = useDeleteCredential();

  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<'source'|'target'>('source');
  const [engine, setEngine] = useState<string>('POSTGRESQL');
  const [form, setForm] = useState<CreateCredentialPayload>({ ...INITIAL_FORM });

  const filtered = selectedId
    ? credentials.filter((c) => c.workspace_id === selectedId)
    : credentials;

  function setField(key: string, value: string) {
    setForm((f) => ({
      ...f,
      encrypted_payload: { ...f.encrypted_payload, [key]: value },
    }));
  }

  function handleOpen() {
    setForm({ ...INITIAL_FORM, workspace_id: selectedId ?? '' });
    setPurpose('source');
    setEngine('POSTGRESQL');
    setOpen(true);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.workspace_id) return;
    create.mutate(form, { onSuccess: () => setOpen(false) });
  }

  const fields = AUTH_FIELDS[form.auth_type];

  return (
    <div className="page">
      <PageHeader
        title="Credentials"
        description="Stored authentication credentials for source and target connections"
        action={
          <Button onClick={handleOpen} disabled={!selectedId}>
            New Credential
          </Button>
        }
      />

      {!selectedId && (
        <div className="alert alert-info">
          Select a workspace in the sidebar to manage credentials.
        </div>
      )}

      {isLoading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No credentials"
          description="Add credentials to authenticate your database connections."
          action={selectedId ? <Button onClick={handleOpen}>Add Credential</Button> : undefined}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Auth Type</th>
                <th>Payload</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cred) => (
                <tr key={cred.id}>
                  <td style={{ fontWeight: 500 }}>{cred.name}</td>
                  <td><Badge variant="accent">{cred.auth_type}</Badge></td>
                  <td className="td-muted">{Object.keys(cred.encrypted_payload).join(', ')} — <em>values hidden</em></td>
                  <td className="td-muted">{new Date(cred.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-icon"
                        title="Delete credential"
                        onClick={() => {
                          if (confirm(`Delete credential "${cred.name}"?`)) remove.mutate(cred.id);
                        }}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New Credential"
        description="Credentials are stored as-is. Use encrypted values in production."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={create.isPending} disabled={!form.name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <Input
          id="cred-name"
          label="Name"
          placeholder="e.g. prod-postgres-creds"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Select
          id="cred-purpose"
          label="Purpose"
          value={purpose}
          onChange={(e) => {
            const p = e.target.value as 'source' | 'target';
            setPurpose(p);
            if (p === 'source') {
              setEngine('POSTGRESQL');
              setForm((f) => ({ ...f, auth_type: 'BASIC', encrypted_payload: {} }));
            } else {
              setEngine('KAFKA');
              setForm((f) => ({ ...f, auth_type: 'NONE', encrypted_payload: {} }));
            }
          }}
          options={[
            { value: 'source', label: 'Source Database' },
            { value: 'target', label: 'Target Broker' },
          ]}
        />
        {purpose === 'source' ? (
          <Select
            id="cred-engine-src"
            label="Database Engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            options={[
              { value: 'POSTGRESQL', label: 'PostgreSQL' },
              { value: 'MYSQL', label: 'MySQL' },
            ]}
          />
        ) : (
          <Select
            id="cred-engine-tgt"
            label="Broker Engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            options={[
              { value: 'KAFKA', label: 'Apache Kafka' },
            ]}
          />
        )}
        <Select
          id="cred-auth-type"
          label="Auth Type"
          value={form.auth_type}
          onChange={(e) => setForm((f) => ({ ...f, auth_type: e.target.value as AuthType, encrypted_payload: {} }))}
          options={
            purpose === 'source'
              ? [
                  { value: 'BASIC', label: 'Basic (Username/Password)' },
                  { value: 'NONE', label: 'None (No Auth)' }
                ]
              : [
                  { value: 'NONE', label: 'None (No Auth)' },
                  { value: 'SASL_JAAS', label: 'SASL JAAS' },
                  { value: 'AWS_IAM', label: 'AWS IAM' }
                ]
          }
        />
        {fields.length > 0 && <hr className="divider" />}
        {fields.map((f) => (
          <Input
            key={f.key}
            id={`cred-${f.key}`}
            label={f.label}
            type={f.secret ? 'password' : 'text'}
            value={form.encrypted_payload[f.key] ?? ''}
            onChange={(e) => setField(f.key, e.target.value)}
          />
        ))}
      </Dialog>
    </div>
  );
}
