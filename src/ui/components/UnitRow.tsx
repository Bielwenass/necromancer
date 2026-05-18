import type { UnitType } from '../../game/types';

export function UnitRow({
  label, color, count, available, onAdjust, maxSize, total,
}: {
  type: UnitType; label: string; color: string;
  count: number; available: number;
  onAdjust: (d: number) => void; maxSize: number; total: number;
}) {
  const canIncrease = count < available && total < maxSize;
  const canDecrease = count > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-bone)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', minWidth: 60, textAlign: 'right' }}>
        {available} available
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onAdjust(-1)} disabled={!canDecrease}
          style={{
            width: 24, height: 24, border: '1px solid var(--rule-strong)',
            color: canDecrease ? 'var(--ink-bone)' : 'var(--ink-faint)',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <span className="mono" style={{ fontSize: 14, color: 'var(--ink-bone)', minWidth: 20, textAlign: 'center' }}>
          {count}
        </span>
        <button
          onClick={() => onAdjust(1)} disabled={!canIncrease}
          style={{
            width: 24, height: 24, border: '1px solid var(--rule-strong)',
            color: canIncrease ? 'var(--ink-bone)' : 'var(--ink-faint)',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
        <button onClick={() => onAdjust(available - count)} disabled={!canIncrease}
          style={{
            width: 48, height: 24, border: '1px solid var(--rule-strong)',
            color: canIncrease ? 'var(--ink-bone)' : 'var(--ink-faint)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >Max</button>
      </div>
    </div>
  );
}
