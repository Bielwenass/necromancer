export function UnitReserve({ type, count, color, canSummon, onSummon, cost }: {
  type: string; count: number; color: string;
  canSummon: (v: number) => boolean; onSummon: () => void; cost: string;
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
          border: `1px solid ${canSummon(1) ? color : 'var(--rule)'}`,
          color: canSummon(1) ? color : 'var(--ink-faint)',
          fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.1em',
          cursor: canSummon(1) ? 'pointer' : 'not-allowed',
          opacity: canSummon(1) ? 1 : 0.5,
        }}
      >Raise</button>
      <button
        onClick={() => {
          if (canSummon(10)) {
            for (let i = 0; i < 10; i++) onSummon();
          }
        }}
        disabled={!canSummon(10)}
        title={`Summon 10 ${type}s (${cost} each)`}
        style={{
          padding: '3px 10px',
          border: `1px solid ${canSummon(10) ? color : 'var(--rule)'}`,
          color: canSummon(10) ? color : 'var(--ink-faint)',
          fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.1em',
          cursor: canSummon(10) ? 'pointer' : 'not-allowed',
          opacity: canSummon(10) ? 1 : 0.5,
        }}
      >+10</button>
    </div>
  );
}
