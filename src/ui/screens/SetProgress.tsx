import { SET_DEFS } from '../../game/data/relics';
import { RelicGlyph } from '../components/RelicGlyph';
import type { SlotId, Relic } from '../../game/types';

export function SetProgress({ equipped, inventory }: {
  equipped: Partial<Record<SlotId, string | null>>;
  inventory: Relic[];
}) {
  const equippedBaseIds = Object.values(equipped)
    .filter(Boolean)
    .map(id => inventory.find(r => r.id === id)?.baseId)
    .filter(Boolean) as string[];

  return (
    <div style={{ height: 152, background: 'var(--bg-panel)', borderTop: '1px solid var(--rule)', padding: '14px 24px', display: 'flex', gap: 16 }}>
      <div style={{ width: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="display" style={{ fontSize: 12, color: 'var(--ink-parchm)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Set Progress</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Collect set pieces to<br />unlock cumulative perks.<br />
          <span style={{ color: 'var(--ink-dim)' }}>{equippedBaseIds.length} EQUIPPED</span>
        </div>
      </div>
      {SET_DEFS.map(s => {
        const collected = s.pieces.filter(p => equippedBaseIds.includes(p)).length;
        return (
          <div key={s.id} style={{ flex: 1, border: '1px solid var(--rule)', padding: '10px 14px', display: 'flex', gap: 14, alignItems: 'center', background: 'var(--bg-panel-2)' }}>
            <div style={{ width: 64, height: 64, border: '1px solid var(--rule-strong)', background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <RelicGlyph kind={s.glyph} size={36} color="var(--ink-parchm)" />
              <div className="mono" style={{ position: 'absolute', bottom: -1, right: -1, fontSize: 9, color: 'var(--ink-bone)', background: 'var(--bg-panel)', padding: '0 4px', border: '1px solid var(--rule)' }}>
                {collected}/{s.pieces.length}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="display" style={{ fontSize: 14, color: 'var(--ink-bone)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{s.name}</div>
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {s.pieces.map((p, i) => {
                  const has = equippedBaseIds.includes(p);
                  return <div key={i} style={{ width: 14, height: 14, border: '1px solid var(--rule-strong)', background: has ? 'var(--ink-parchm)' : 'transparent', opacity: has ? 1 : 0.4 }} />;
                })}
              </div>
              <div style={{ marginTop: 8 }}>
                {s.perks.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '1px 0' }}>
                    <span className="mono" style={{ fontSize: 9, color: collected >= p.at ? 'var(--c-coin)' : 'var(--ink-dim)', minWidth: 22 }}>({p.at})</span>
                    <span style={{ fontSize: 10, color: collected >= p.at ? 'var(--ink-bone)' : 'var(--ink-dim)' }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
