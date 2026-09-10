interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'rose' | 'ink';
}

export function StatCard({ label, value, detail, tone }: StatCardProps) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-label"><span className="stat-bullet" />{label}</div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}
