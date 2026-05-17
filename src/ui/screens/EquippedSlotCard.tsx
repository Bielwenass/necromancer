import type { Relic, SlotId } from '../../game/types';
import { RelicCard } from '../components/RelicCard';

export function EquippedSlotCard({
  slotId, slotLabel, relic, selected, onSelect, onUnequip,
}: {
  slotId: SlotId;
  slotLabel: string;
  relic: Relic | null;
  selected: boolean;
  onSelect: () => void;
  onUnequip: () => void;
}) {
  void slotId;
  if (!relic) {
    return (
      <div
        onClick={onSelect}
        style={{
          width: 130,
          aspectRatio: '320 / 460',
          background: 'var(--bg-inset)',
          border: '1px dashed var(--rule)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer',
        }}
      >
        <div className="mono" style={{ fontSize: 18, color: 'var(--ink-faint)' }}>+</div>
        <div className="mono" style={{ position: 'absolute', top: 8, left: 10, fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>{slotLabel}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em', marginTop: 10 }}>EMPTY</div>
      </div>
    );
  }

  return (
    <div style={{ width: 130, position: 'relative' }}>
      <RelicCard relic={relic} variant="inventory" selected={selected} onClick={onSelect} />
      <div className="mono" style={{
        position: 'absolute', top: 6, left: 8, fontSize: 7,
        color: 'var(--ink-dim)', letterSpacing: '0.1em',
        zIndex: 10, pointerEvents: 'none',
      }}>{slotLabel}</div>
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnequip(); }}
          style={{
            position: 'absolute', top: 4, right: 6, fontSize: 9,
            color: 'var(--ink-muted)', fontFamily: 'var(--f-mono)',
            zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >✕</button>
      )}
    </div>
  );
}
