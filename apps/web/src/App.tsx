import { StatusCard } from '@neverlight/ui';
import '@neverlight/ui/styles.css';

import './styles.css';

export function App() {
  return (
    <main className="foundation-shell">
      <header className="foundation-header">
        <p className="foundation-kicker">FOUNDATION BUILD</p>
        <h1>Project Neverlight</h1>
        <p>
          The project foundation is ready for future game systems. This screen intentionally
          contains no game content yet.
        </p>
      </header>

      <StatusCard title="Bootstrap status">
        <ul>
          <li>TypeScript workspace boundaries are in place.</li>
          <li>Local Worker and D1 development are configured.</li>
          <li>Rules, content, and UI packages are ready for later packets.</li>
        </ul>
        <p>
          <a href="/api/health">Check the local Worker health endpoint</a>
        </p>
      </StatusCard>
    </main>
  );
}
