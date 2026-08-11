import { useState } from 'react';
import { useGameStore } from '../../game/store';
import { formatTime } from '../theme';

export function NecroticSurge() {
  const surge = useGameStore(s => s.surge);
  const activateSurge = useGameStore(s => s.activateSurge);
  const [showBuff, setShowBuff] = useState(false);

  const R = 38;
  const C = 2 * Math.PI * R;
  const cdPct = surge.cooldownTicks > 0 ? 1 - (surge.cooldownTicks / 900) : 1;
  const canActivate = surge.charges > 0 && !surge.activeBuff;
  const timeLeft = surge.activeBuff ? formatTime(surge.buffTicksRemaining) : formatTime(surge.cooldownTicks);
  const label = surge.activeBuff
    ? surge.activeBuff.toUpperCase() + ' ACTIVE'
    : surge.charges > 0 ? 'READY' : 'CHARGING';

  const handleActivate = (buff: 'yield' | 'speed' | 'damage') => {
    activateSurge(buff);
    setShowBuff(false);
  };

  const ringColor = surge.activeBuff ? 'var(--c-coin)' : 'var(--c-soul)';

  return (
    <div className="p-5 border-t border-rule bg-gradient-to-b from-bg-panel to-[#110d08]">
      <div className="flex justify-between items-baseline mb-[14px]">
        <div className="display text-xs text-parchm !tracking-[0.24em] uppercase">
          Necrotic Surge
        </div>
        <div className="mono text-[9px] text-dim tracking-[0.1em]">R · ULT</div>
      </div>

      <div className="flex gap-[14px] items-center">
        {/* Cooldown ring */}
        <div className="relative w-[92px] h-[92px] shrink-0">
          <svg width="92" height="92" className="-rotate-90">
            <circle cx="46" cy="46" r={R} fill="none" stroke="var(--rule)" strokeWidth="2" />
            <circle
              cx="46" cy="46" r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="2"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - cdPct)}
              style={{ filter: `drop-shadow(0 0 4px ${ringColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="display text-base text-bone !tracking-[0.08em]">
              {surge.activeBuff ? timeLeft : surge.cooldownTicks > 0 ? timeLeft : '—'}
            </div>
            <div
              className="mono text-[8px] tracking-[0.12em]"
              style={{ color: surge.activeBuff ? 'var(--c-coin)' : surge.charges > 0 ? 'var(--c-soul)' : 'var(--ink-dim)' }}
            >
              {label}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {/* Charges */}
          <div className="flex gap-[6px] mb-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-[18px] h-[18px] border"
                style={{
                  borderColor: i < surge.charges ? 'var(--c-soul)' : 'var(--rule)',
                  background:  i < surge.charges ? 'rgba(155,122,214,0.2)' : 'transparent',
                  boxShadow:   i < surge.charges ? '0 0 6px var(--c-soul)' : 'none',
                }}
              />
            ))}
            <span className="mono text-[9px] text-muted ml-1 leading-[18px]">
              {surge.charges}/3 CHARGES
            </span>
          </div>

          {surge.activeBuff && (
            <div className="mono text-[10px] text-coin leading-[1.4]">
              {surge.activeBuff === 'yield' ? '×2 Resource Yield' :
               surge.activeBuff === 'speed' ? '×2 Squad Speed' :
               '×2 Squad Damage'}
            </div>
          )}

          {canActivate && !surge.activeBuff && (
            <button
              onClick={() => setShowBuff(v => !v)}
              className="!px-4 !py-2 !border !border-soul !text-soul display !text-xs !tracking-[0.22em] !uppercase !bg-[rgba(155,122,214,0.06)] mt-1"
            >
              ACTIVATE
            </button>
          )}
        </div>
      </div>

      {/* Buff selection */}
      {showBuff && (
        <div className="flex gap-2 mt-[14px]">
          {(['yield', 'speed', 'damage'] as const).map(buff => (
            <button
              key={buff}
              onClick={() => handleActivate(buff)}
              className="!flex-1 !py-2 !border !border-soul !text-bone display !text-[10px] !tracking-[0.16em] !uppercase !bg-[rgba(155,122,214,0.08)]"
            >
              ×2 {buff}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
