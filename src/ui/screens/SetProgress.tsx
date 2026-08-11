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
    <div className="h-[152px] bg-bg-panel border-t border-rule py-[14px] px-6 flex gap-4">
      <div className="w-[180px] flex flex-col justify-between">
        <div className="display text-xs text-parchm !tracking-[0.28em] uppercase">Set Progress</div>
        <div className="mono text-[10px] text-muted leading-[1.5]">
          Collect set pieces to<br />unlock cumulative perks.<br />
          <span className="text-dim">{equippedBaseIds.length} EQUIPPED</span>
        </div>
      </div>

      {SET_DEFS.map(s => {
        const collected = s.pieces.filter(p => equippedBaseIds.includes(p)).length;
        return (
          <div key={s.id} className="flex-1 border border-rule px-[14px] py-[10px] flex gap-[14px] items-center bg-bg-panel-2">
            <div className="w-16 h-16 border border-rule-strong bg-bg-inset flex items-center justify-center relative">
              <RelicGlyph kind={s.glyph} size={36} color="var(--ink-parchm)" />
              <div className="mono absolute -bottom-px -right-px text-[9px] text-bone bg-bg-panel px-1 border border-rule">
                {collected}/{s.pieces.length}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="display text-sm text-bone !tracking-[0.18em] uppercase">{s.name}</div>
              <div className="flex gap-[3px] mt-[6px]">
                {s.pieces.map((p, i) => {
                  const has = equippedBaseIds.includes(p);
                  return (
                    <div
                      key={i}
                      className="w-[14px] h-[14px] border border-rule-strong"
                      style={{ background: has ? 'var(--ink-parchm)' : 'transparent', opacity: has ? 1 : 0.4 }}
                    />
                  );
                })}
              </div>
              <div className="mt-2">
                {s.perks.map((p, i) => (
                  <div key={i} className="flex items-baseline gap-2 py-px">
                    <span className="mono text-[9px] min-w-[22px]" style={{ color: collected >= p.at ? 'var(--c-coin)' : 'var(--ink-dim)' }}>({p.at})</span>
                    <span className="text-[10px]" style={{ color: collected >= p.at ? 'var(--ink-bone)' : 'var(--ink-dim)' }}>{p.label}</span>
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
