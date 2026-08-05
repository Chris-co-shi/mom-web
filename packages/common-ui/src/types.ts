export interface PageProps {
  title?: string;
  description?: string;
  labelledBy?: string;
}

export type DataStateKind =
  | 'LOADING'
  | 'EMPTY'
  | 'NO_RESULT'
  | 'ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PARTIAL';

export interface DataStateProps {
  kind: DataStateKind;
  title: string;
  description?: string;
  correlationId?: string;
  actionLabel?: string;
}

export interface ActionBarProps {
  label?: string;
}

export type ConfirmActionState = 'IDLE' | 'SUBMITTING' | 'RESULT_UNKNOWN';

export interface ConfirmActionProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  state: ConfirmActionState;
  danger?: boolean;
  requireReason?: boolean;
  reason?: string;
  reasonLabel?: string;
  reasonError?: string;
}

export interface AuthShellProps {
  channel: 'ADMIN' | 'PORTAL';
  title: string;
  description?: string;
}

export interface PortalShellProps {
  title: string;
  subtitle?: string;
}
