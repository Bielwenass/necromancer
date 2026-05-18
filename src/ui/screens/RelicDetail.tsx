import { RELIC_BASES } from '../../game/data/relics';
import { DUST_VALUES } from '../../game/relics';
import { rarityColor } from '../theme';
import type { Relic, SlotId } from '../../game/types';
import { RelicCard } from '../components/RelicCard';

export function RelicDetail({
  relic, onSacrifice, onEquip, confirmSacrifice, onCancelSacrifice,
}: {
  relic: Relic;
  onSacrifice: () => void;
  onEquip: (slotId: SlotId) => void;
  confirmSacrifice: boolean;
  onCancelSacrifice: () => void;
}) {
  const c = rarityColor(relic.rarity);
  const base = RELIC_BASES.find(b => b.id === relic.baseId);
  const dustValue = DUST_VALUES[relic.rarity];

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 300 }}>
          <RelicCard relic={relic} variant="pull" tweaks={{ idleDrift: false }} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-muted)', letterSpacing: '0.14em' }}>QUALITY</span>
          <span className="mono" style={{ fontSize: 11, color: c }}>
            {relic.quality}<span style={{ color: 'var(--ink-dim)' }}>/100</span>
          </span>
        </div>
        <div className="bar-meter" style={{ marginTop: 4, height: 5 }}>
          <i style={{ width: `${relic.quality}%`, background: c }} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em' }}>FUSION PROGRESS</span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-muted)' }}>{relic.duplicateCount}/5 DUPES</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 10,
              background: i < relic.duplicateCount ? c : 'var(--bg-inset)',
              border: `1px solid ${i < relic.duplicateCount ? c : 'var(--rule)'}`,
              opacity: i < relic.duplicateCount ? 1 : 0.4,
            }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 16 }}>
        {!confirmSacrifice ? (
          <button
            onClick={onSacrifice}
            style={{
              flex: 1, padding: '10px 0',
              border: '1px solid var(--rule-strong)',
              color: 'var(--ink-parchm)',
              fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}
          >
            Sacrifice (+{dustValue} dust)
          </button>
        ) : (
          <>
            <button onClick={onCancelSacrifice} style={{
              flex: 1, padding: '10px 0', border: '1px solid var(--rule-strong)', color: 'var(--ink-muted)',
              fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>Cancel</button>
            <button onClick={onSacrifice} style={{
              flex: 1, padding: '10px 0', border: '1px solid var(--hp-crit)', color: 'var(--hp-crit)',
              fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
              background: 'rgba(196,90,62,0.08)',
            }}>Confirm</button>
          </>
        )}
      </div>

      {base && (
        <div style={{ marginTop: 8 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em', marginBottom: 4 }}>EQUIP TO SLOT</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {base.slotIds.map(slotId => (
              <button
                key={slotId}
                onClick={() => onEquip(slotId)}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--rule-strong)',
                  color: 'var(--ink-muted)',
                  fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em',
                }}
              >{slotId}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
