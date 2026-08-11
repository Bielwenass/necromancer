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
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] flex flex-col items-center justify-center z-[200]">
      {/* Ray burst */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
        <defs>
          <radialGradient id="raysFade2" cx="50%" cy="45%" r="40%">
            <stop offset="0%"   stopColor="var(--c-coin)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--c-coin)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#raysFade2)" />
      </svg>

      <div className="display text-sm text-coin !tracking-[0.36em] mb-6 z-[1]">
        REVELATION · {relics.length} OF {relics.length}
      </div>

      <div className="flex gap-[14px] flex-wrap justify-center max-w-[1600px] z-[1]">
        {relics.map((relic, i) => (
          <div key={relic.id} className="w-[280px]">
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

      <div className="flex gap-3 mt-8 z-[1]">
        {!allRevealed && (
          <button
            onClick={skipAll}
            className="!px-6 !py-[10px] !border !border-rule-strong display !text-xs !tracking-[0.22em] !text-muted"
          >
            SKIP ALL
          </button>
        )}
        {allRevealed && (
          <button
            onClick={onClose}
            className="!px-8 !py-3 !border !border-coin display !text-xs !tracking-[0.28em] !text-coin !bg-[rgba(212,168,87,0.06)]"
          >
            COLLECT
          </button>
        )}
      </div>
    </div>
  );
}
