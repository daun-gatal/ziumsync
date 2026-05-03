import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  KeyRound,
  Cable,
  GitCompare,
  Workflow,
  Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getHealth, getWorkspaces } from '../../lib/api';
import { useWorkspaceContext } from '../../context/WorkspaceContext';

const navItems = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/workspaces',  label: 'Workspaces',  icon: FolderKanban },
  { to: '/credentials', label: 'Credentials', icon: KeyRound },
  { to: '/connections', label: 'Connections', icon: Cable },
  { to: '/pipelines',   label: 'Pipelines',   icon: GitCompare },
  { to: '/builder',     label: 'Builder',     icon: Workflow },
];

export function Sidebar() {
  const { selectedId, setSelectedId } = useWorkspaceContext();

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15_000,
    retry: false,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  });

  useEffect(() => {
    if (workspaces.length > 0 && !selectedId) {
      setSelectedId(workspaces[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  const isOnline = health?.status === 'ok';

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <Zap size={18} />
        ZiumSync
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-workspace">
        <label htmlFor="workspace-select">Workspace</label>
        {workspaces.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12 }}>No workspaces yet</p>
        ) : (
          <select
            id="workspace-select"
            className="select"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        )}

        <div className={`health-dot ${isOnline ? 'online' : 'offline'}`} style={{ marginTop: 8 }}>
          API {isOnline ? 'online' : 'offline'}
        </div>
      </div>
    </nav>
  );
}
