import type { PipelineStatus } from '../../lib/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'accent' | 'green';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: PipelineStatus }) {
  const label: Record<PipelineStatus, string> = {
    RUNNING: 'Running',
    STOPPED: 'Stopped',
    DEPLOYING: 'Deploying',
    FAILED: 'Failed',
  };
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="badge-dot" />
      {label[status]}
    </span>
  );
}
