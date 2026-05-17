import type { Relic } from '../../game/types';
import { RelicCard } from '../components/RelicCard';

export function InvCard({ relic, selected, onSelect }: {
  relic: Relic; selected: boolean; onSelect: () => void;
}) {
  return (
    <div style={{ width: 124, position: 'relative' }}>
      <RelicCard relic={relic} variant="inventory" selected={selected} onClick={onSelect} />
      {relic.isNew && (
        <div className="mono" style={{
          position: 'absolute', top: 8, right: 8, fontSize: 8,
          color: 'var(--c-coin)', letterSpacing: '0.1em',
          zIndex: 10, pointerEvents: 'none',
        }}>NEW</div>
      )}
      {relic.duplicateCount > 0 && !relic.isNew && (
        <div className="mono" style={{
          position: 'absolute', top: 8, right: 8, fontSize: 8,
          color: 'var(--ink-muted)', letterSpacing: '0.1em',
          zIndex: 10, pointerEvents: 'none',
        }}>×{relic.duplicateCount + 1}</div>
      )}
    </div>
  );
}
