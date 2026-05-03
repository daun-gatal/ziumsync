import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal aria-labelledby="dialog-title">
        <div className="dialog-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {children}
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SlideOver({ open, onClose, title, children, footer }: SlideOverProps) {
  if (!open) return null;
  return (
    <>
      <div className="slideover-overlay" onClick={onClose} />
      <div className="slideover">
        <div className="slideover-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose}><X /></button>
        </div>
        <div className="slideover-body">{children}</div>
        {footer && <div className="slideover-footer">{footer}</div>}
      </div>
    </>
  );
}
