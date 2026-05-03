import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace } from '../hooks/useWorkspaces';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingRow } from '../components/ui/Spinner';

export default function Workspaces() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const create = useCreateWorkspace();
  const remove = useDeleteWorkspace();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleCreate() {
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, {
      onSuccess: () => { setOpen(false); setName(''); },
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Workspaces"
        description="Logical groupings for your CDC resources"
        action={
          <Button onClick={() => setOpen(true)}>New Workspace</Button>
        }
      />

      {isLoading ? (
        <LoadingRow />
      ) : workspaces.length === 0 ? (
        <EmptyState
          title="No workspaces"
          description="Create a workspace to start organizing your pipelines and connections."
          action={<Button onClick={() => setOpen(true)}>Create Workspace</Button>}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td style={{ fontWeight: 500 }}>{ws.name}</td>
                  <td className="td-mono">{ws.id}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-icon"
                        title="Delete workspace"
                        onClick={() => {
                          if (confirm(`Delete workspace "${ws.name}"?`)) {
                            remove.mutate(ws.id);
                          }
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
        onClose={() => { setOpen(false); setName(''); }}
        title="New Workspace"
        description="Give your workspace a descriptive name."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              loading={create.isPending}
              disabled={!name.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          id="workspace-name"
          label="Name"
          placeholder="e.g. production"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
      </Dialog>
    </div>
  );
}
