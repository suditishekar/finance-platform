export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><div className="empty-icon">＋</div><strong>{title}</strong><p>{message}</p></div>;
}
