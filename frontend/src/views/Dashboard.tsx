import { useNavigate } from 'react-router-dom';
import { usePipelines } from '../hooks/usePipelines';
import { useSourceConnections, useTargetConnections } from '../hooks/useConnections';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { StatusBadge } from '../components/ui/Badge';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingRow } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: pipelines = [], isLoading: pLoading } = usePipelines();
  const { data: sources = [] } = useSourceConnections();
  const { data: targets = [] } = useTargetConnections();
  const { data: workspaces = [] } = useWorkspaces();

  const running  = pipelines.filter((p) => p.status === 'RUNNING').length;
  const failed   = pipelines.filter((p) => p.status === 'FAILED').length;
  const deploying = pipelines.filter((p) => p.status === 'DEPLOYING').length;

  const recent = [...pipelines]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        description="Overview of your CDC infrastructure"
        action={
          <Button onClick={() => navigate('/builder')} variant="primary">
            New Pipeline
          </Button>
        }
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Workspaces</div>
          <div className="stat-value">{workspaces.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pipelines</div>
          <div className="stat-value">{pipelines.length}</div>
          <div className="stat-sub">{deploying > 0 ? `${deploying} deploying` : 'total'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Running</div>
          <div className="stat-value text-green">{running}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value text-red">{failed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Connections</div>
          <div className="stat-value">{sources.length + targets.length}</div>
          <div className="stat-sub">{sources.length} source · {targets.length} target</div>
        </div>
      </div>

      <div className="card">
        <div className="detail-section">
          <h3>Recent Pipelines</h3>
        </div>
        {pLoading ? (
          <LoadingRow />
        ) : recent.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            No pipelines yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate('/builder')}>Create one →</button>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Snapshot</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><span className="badge badge-neutral">{p.snapshot_mode}</span></td>
                    <td className="td-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="actions-cell">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/pipelines/${p.id}`)}>
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
