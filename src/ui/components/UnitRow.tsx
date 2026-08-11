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
    <div className="flex items-center gap-3 py-2 border-b border-rule">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="flex-1 text-sm text-bone">{label}</span>
      <span className="mono text-[10px] text-muted min-w-[60px] text-right">
        {available} available
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-1)} disabled={!canDecrease}
          className="!w-6 !h-6 !border !border-rule-strong !text-base flex items-center justify-center"
          style={{ color: canDecrease ? 'var(--ink-bone)' : 'var(--ink-faint)' }}
        >−</button>
        <span className="mono text-sm text-bone min-w-[20px] text-center">{count}</span>
        <button
          onClick={() => onAdjust(1)} disabled={!canIncrease}
          className="!w-6 !h-6 !border !border-rule-strong !text-base flex items-center justify-center"
          style={{ color: canIncrease ? 'var(--ink-bone)' : 'var(--ink-faint)' }}
        >+</button>
        <button
          onClick={() => onAdjust(available - count)} disabled={!canIncrease}
          className="!w-12 !h-6 !border !border-rule-strong !text-sm flex items-center justify-center"
          style={{ color: canIncrease ? 'var(--ink-bone)' : 'var(--ink-faint)' }}
        >Max</button>
      </div>
    </div>
  );
}
