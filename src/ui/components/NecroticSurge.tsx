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

  return (
    <div style={{
      padding: 20,
      borderTop: '1px solid var(--rule)',
      background: 'linear-gradient(180deg, var(--bg-panel) 0%, #110d08 100%)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div className="display" style={{ fontSize: 11, color: 'var(--ink-parchm)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>
          Necrotic Surge
        </div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>R · ULT</div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {/* Cooldown ring */}
        <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
          <svg width="92" height="92" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="46" cy="46" r={R} fill="none" stroke="var(--rule)" strokeWidth="2" />
            <circle
              cx="46" cy="46" r={R}
              fill="none"
              stroke={surge.activeBuff ? 'var(--c-coin)' : 'var(--c-soul)'}
              strokeWidth="2"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - cdPct)}
              style={{ filter: `drop-shadow(0 0 4px ${surge.activeBuff ? 'var(--c-coin)' : 'var(--c-soul)'})` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="display" style={{ fontSize: 16, color: 'var(--ink-bone)', letterSpacing: '0.08em' }}>
              {surge.activeBuff ? timeLeft : surge.cooldownTicks > 0 ? timeLeft : '—'}
            </div>
            <div className="mono" style={{
              fontSize: 8, color: surge.activeBuff ? 'var(--c-coin)' : surge.charges > 0 ? 'var(--c-soul)' : 'var(--ink-dim)',
              letterSpacing: '0.12em',
            }}>
              {label}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {/* Charges */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 18, height: 18,
                  border: `1px solid ${i < surge.charges ? 'var(--c-soul)' : 'var(--rule)'}`,
                  background: i < surge.charges ? 'rgba(155,122,214,0.2)' : 'transparent',
                  boxShadow: i < surge.charges ? '0 0 6px var(--c-soul)' : 'none',
                }}
              />
            ))}
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-muted)', marginLeft: 4, lineHeight: '18px' }}>
              {surge.charges}/3 CHARGES
            </span>
          </div>

          {/* Active buff description */}
          {surge.activeBuff && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--c-coin)', lineHeight: 1.4 }}>
              {surge.activeBuff === 'yield' ? '×2 Resource Yield' :
               surge.activeBuff === 'speed' ? '×2 Squad Speed' :
               '×2 Squad Damage'}
            </div>
          )}

          {/* Activate button */}
          {canActivate && !surge.activeBuff && (
            <button
              onClick={() => setShowBuff(v => !v)}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--c-soul)',
                color: 'var(--c-soul)',
                fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
                background: 'rgba(155,122,214,0.06)',
                marginTop: 4,
              }}
            >
              ACTIVATE
            </button>
          )}
        </div>
      </div>

      {/* Buff selection */}
      {showBuff && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          {(['yield', 'speed', 'damage'] as const).map(buff => (
            <button
              key={buff}
              onClick={() => handleActivate(buff)}
              style={{
                flex: 1, padding: '8px 0',
                border: '1px solid var(--c-soul)',
                color: 'var(--ink-bone)',
                fontFamily: 'var(--f-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                background: 'rgba(155,122,214,0.08)',
              }}
            >
              ×2 {buff}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
