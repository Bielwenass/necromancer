import { useState, useEffect, useRef } from 'react';
import type { Relic } from '../../game/types';
import { RelicCard } from '../components/RelicCard';

const FIRST_DELAY_MS = 400;
const STAGGER_MS = 500;

export function RevealOverlay({ relics, onClose }: { relics: Relic[]; onClose: () => void }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const allRevealed = revealedCount >= relics.length;

  useEffect(() => {
    relics.forEach((_, i) => {
      const id = setTimeout(
        () => setRevealedCount(i + 1),
        FIRST_DELAY_MS + i * STAGGER_MS,
      );
      timersRef.current.push(id);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const skipAll = () => {
    timersRef.current.forEach(clearTimeout);
    setRevealedCount(relics.length);
  };

  const cardW = 280;
  const cardH = Math.round(cardW * 460 / 320);

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
        {relics.map((relic, i) => {
          const isRevealed = i < revealedCount;
          return isRevealed ? (
            <div key={relic.id} style={{ width: cardW }}>
              <RelicCard relic={relic} variant="pull" />
            </div>
          ) : (
            <div
              key={relic.id}
              style={{
                width: cardW, height: cardH,
                border: '1px solid var(--rule-strong)',
                background: 'var(--bg-panel)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <div style={{ width: 24, height: 56, border: '1px solid var(--rule)', opacity: 0.5 }} />
            </div>
          );
        })}
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
