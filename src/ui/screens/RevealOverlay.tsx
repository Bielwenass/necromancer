import { useState, useRef } from 'react';
import type { Relic } from '../../game/types';
import { RelicCard } from '../components/RelicCard';

const STAGGER_MS = 500;

export function RevealOverlay({ relics, onClose }: { relics: Relic[]; onClose: () => void }) {
  const [skipped, setSkipped] = useState(false);
  const completedRef = useRef(0);
  const [allRevealed, setAllRevealed] = useState(false);

  const onRevealComplete = () => {
    completedRef.current += 1;
    if (completedRef.current >= relics.length) setAllRevealed(true);
  };

  const skipAll = () => {
    setSkipped(true);
    setAllRevealed(true);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
        <defs>
          <radialGradient id="raysFade2" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stopColor="var(--c-coin)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--c-coin)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#raysFade2)" />
      </svg>

      <div className="display" style={{ fontSize: 14, color: 'var(--c-coin)', letterSpacing: '0.36em', marginBottom: 24, zIndex: 1 }}>
        REVELATION · {relics.length} OF {relics.length}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1600, zIndex: 1 }}>
        {relics.map((relic, i) => (
          <div key={relic.id} style={{ width: 280 }}>
            <RelicCard
              relic={relic}
              variant="pull"
              revealing={!skipped}
              revealDelay={i * STAGGER_MS}
              onRevealComplete={onRevealComplete}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 32, zIndex: 1 }}>
        {!allRevealed && (
          <button
            onClick={skipAll}
            style={{
              padding: '10px 24px',
              border: '1px solid var(--rule-strong)',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em',
            }}
          >
            SKIP ALL
          </button>
        )}
        {allRevealed && (
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px',
              border: '1px solid var(--c-coin)',
              color: 'var(--c-coin)',
              fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '0.28em',
              background: 'rgba(212,168,87,0.06)',
            }}
          >
            COLLECT
          </button>
        )}
      </div>
    </div>
  );
}
