export function UnitReserve({ type, count, color, canSummon, onSummon, cost }: {
  type: string; count: number; color: string;
  canSummon: boolean; onSummon: () => void; cost: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span className="mono" style={{ fontSize: 16, color: 'var(--ink-bone)', minWidth: 32 }}>{count}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>{type}</span>
      <button
        onClick={onSummon}
        disabled={!canSummon}
        title={`Summon 1 ${type} (${cost})`}
        style={{
          padding: '3px 10px',
          border: `1px solid ${canSummon ? color : 'var(--rule)'}`,
          color: canSummon ? color : 'var(--ink-faint)',
          fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.1em',
          cursor: canSummon ? 'pointer' : 'not-allowed',
          opacity: canSummon ? 1 : 0.5,
        }}
      >+1</button>
    </div>
  );
}
