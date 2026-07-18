export interface StatusSummary {
  label: string;
  value: number | string;
  status: 'default' | 'processing' | 'success' | 'warning' | 'error';
}

export interface WorkQueueItem {
  id: string;
  title: string;
  description: string;
  status: StatusSummary['status'];
}
