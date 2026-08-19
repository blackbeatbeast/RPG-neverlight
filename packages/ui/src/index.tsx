import type { ReactNode } from 'react';

export interface StatusCardProps {
  children: ReactNode;
  title: string;
}

export function StatusCard({ children, title }: StatusCardProps) {
  return (
    <section aria-labelledby="status-card-title" className="status-card">
      <h2 id="status-card-title">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
