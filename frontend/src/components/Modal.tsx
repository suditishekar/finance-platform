import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  labelledBy?: string;
}

export function Modal({ title, eyebrow, children, onClose, actions, labelledBy = 'modal-title' }: ModalProps) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}><div className="modal-heading"><div>{eyebrow && <span className="section-eyebrow">{eyebrow}</span>}<h2 id={labelledBy}>{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>{children}{actions && <div className="modal-actions">{actions}</div>}</section></div>;
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirm', busy = false, onCancel, onConfirm }: ConfirmModalProps) {
  return <Modal title={title} eyebrow="Please confirm" onClose={busy ? () => undefined : onCancel} labelledBy="confirm-modal-title" actions={<><button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working...' : confirmLabel}</button></>}><p className="confirm-message">{message}</p></Modal>;
}
