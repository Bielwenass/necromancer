import { useState } from 'react';
import { useGameStore } from '../../game/store';
import { TopBar } from '../components/TopBar';
import { TabBar } from '../components/TabBar';
import type { TabId } from '../components/TabBar';
import { IconCrypt } from '../components/Icons';
import { rarityColor } from '../theme';
import type { SlotId, Rarity } from '../../game/types';
import { EquippedSlotCard } from './EquippedSlotCard';
import { InvCard } from './InvCard';
import { RelicDetail } from './RelicDetail';
import { SetProgress } from './SetProgress';

const SLOT_GROUPS: { title: string; subtitle: string; slots: { id: SlotId; label: string }[]; unitType?: 'skeleton' | 'zombie' | 'wraith' }[] = [
  {
    title: 'The Crypt', subtitle: 'Sanctum · 3 slots',
    slots: [{ id: 'C1', label: 'C-I' }, { id: 'C2', label: 'C-II' }, { id: 'C3', label: 'C-III' }],
  },
  {
    title: 'Summoning Circle I', subtitle: 'Skeleton · 2 slots', unitType: 'skeleton',
    slots: [{ id: 'I1', label: 'I-α' }, { id: 'I2', label: 'I-β' }],
  },
  {
    title: 'Summoning Circle II', subtitle: 'Zombie · 2 slots', unitType: 'zombie',
    slots: [{ id: 'II1', label: 'II-α' }, { id: 'II2', label: 'II-β' }],
  },
  {
    title: 'Summoning Circle III', subtitle: 'Wraith · 2 slots', unitType: 'wraith',
    slots: [{ id: 'III1', label: 'III-α' }, { id: 'III2', label: 'III-β' }],
  },
];

interface ReliquaryProps {
  onTabChange: (tab: TabId) => void;
}

export function Reliquary({ onTabChange }: ReliquaryProps) {
  const inventory = useGameStore(s => s.relics.inventory);
  const equipped = useGameStore(s => s.relics.equipped);
  const derived = useGameStore(s => s.derived);
  const equipRelic = useGameStore(s => s.equipRelic);
  const unequipRelic = useGameStore(s => s.unequipRelic);
  const sacrificeRelic = useGameStore(s => s.sacrificeRelic);

  const [selectedRelicId, setSelectedRelicId] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | null>(null);
  const [confirmSacrifice, setConfirmSacrifice] = useState(false);

  const selectedRelic = inventory.find(r => r.id === selectedRelicId) ??
    (selectedRelicId ? Object.values(equipped).map(id => inventory.find(r => r.id === id)).find(r => r?.id === selectedRelicId) : null);

  const filteredInventory = filterRarity
    ? inventory.filter(r => r.rarity === filterRarity)
    : inventory;

  const handleSlotClick = (slotId: SlotId) => {
    const equippedId = equipped[slotId];
    if (selectedRelicId && !equippedId) {
      equipRelic(selectedRelicId, slotId);
      setSelectedRelicId(null);
    } else if (equippedId) {
      setSelectedRelicId(equippedId);
    }
  };

  const handleSacrifice = () => {
    if (!selectedRelicId) return;
    sacrificeRelic(selectedRelicId);
    setSelectedRelicId(null);
    setConfirmSacrifice(false);
  };

  return (
    <div className="necro">
      <TopBar />

      <div className="stage" style={{ flexDirection: 'column' }}>
        {/* Sub-tabs */}
        <div style={{ height: 40, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--rule)', padding: '0 24px', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', gap: 22 }}>
            {['All', 'By Slot', 'Sets', 'New'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingBottom: 4, borderBottom: i === 0 ? '1px solid var(--c-coin)' : 'none' }}>
                <span className="display" style={{
                  fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: i === 0 ? 'var(--ink-bone)' : 'var(--ink-muted)',
                }}>{label}</span>
                <span className="mono" style={{ fontSize: 9, color: label === 'New' ? 'var(--c-coin)' : 'var(--ink-dim)' }}>
                  {label === 'All' ? inventory.length : label === 'New' ? inventory.filter(r => r.isNew).length : ''}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em' }}>FILTER</span>
            {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => (
              <div
                key={r}
                onClick={() => setFilterRarity(filterRarity === r ? null : r)}
                style={{
                  fontSize: 9, padding: '3px 8px',
                  border: `1px solid ${filterRarity === r ? rarityColor(r) : 'var(--rule)'}`,
                  color: filterRarity === r ? rarityColor(r) : 'var(--ink-muted)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'var(--f-mono)',
                }}
              >{r}</div>
            ))}
          </div>
        </div>

        {/* 3-column body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* LEFT — Equipped */}
          <div style={{ width: 560, padding: '22px 24px', borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
            <div className="display" style={{ fontSize: 13, color: 'var(--ink-parchm)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Equipped</div>
            {SLOT_GROUPS.map(group => {
              if (group.unitType === 'zombie' && !derived.zombiesUnlocked) return null;
              if (group.unitType === 'wraith' && !derived.wraithsUnlocked) return null;
              const dotColor = group.unitType === 'skeleton' ? 'var(--sq-skeleton)'
                : group.unitType === 'zombie' ? 'var(--sq-zombie)'
                : group.unitType === 'wraith' ? 'var(--sq-wraith)'
                : null;
              return (
                <div key={group.title}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {dotColor
                      ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                      : <IconCrypt size={12} color="var(--ink-muted)" />
                    }
                    <span className="display" style={{ fontSize: 10, color: 'var(--ink-bone)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{group.title}</span>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{group.subtitle}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--rule)', marginLeft: 6 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {group.slots.map(slot => {
                      const relicId = equipped[slot.id];
                      const relic = relicId ? inventory.find(r => r.id === relicId) : null;
                      return (
                        <EquippedSlotCard
                          key={slot.id}
                          slotId={slot.id}
                          slotLabel={slot.label}
                          relic={relic ?? null}
                          selected={selectedRelicId === relicId && !!relicId}
                          onSelect={() => handleSlotClick(slot.id)}
                          onUnequip={() => unequipRelic(slot.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CENTER — Detail */}
          <div style={{ width: 380, borderRight: '1px solid var(--rule)', background: 'linear-gradient(180deg, #15110b 0%, #0f0c08 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedRelic ? (
              <RelicDetail
                relic={selectedRelic}
                onSacrifice={() => { if (confirmSacrifice) handleSacrifice(); else setConfirmSacrifice(true); }}
                onEquip={(slotId) => { equipRelic(selectedRelic.id, slotId); setSelectedRelicId(null); }}
                confirmSacrifice={confirmSacrifice}
                onCancelSacrifice={() => setConfirmSacrifice(false)}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', textAlign: 'center' }}>
                  SELECT A RELIC<br />TO VIEW DETAILS
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Inventory */}
          <div style={{ flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="display" style={{ fontSize: 13, color: 'var(--ink-parchm)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Inventory</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.1em' }}>{inventory.length} RELICS</div>
            </div>
            {inventory.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.14em' }}>
                  NO RELICS · PERFORM RITUALS TO OBTAIN
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 124px)',
                gap: 10, alignContent: 'start', overflowY: 'auto', flex: 1,
              }}>
                {filteredInventory.map(relic => (
                  <InvCard
                    key={relic.id}
                    relic={relic}
                    selected={selectedRelicId === relic.id}
                    onSelect={() => setSelectedRelicId(relic.id === selectedRelicId ? null : relic.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <SetProgress equipped={equipped} inventory={inventory} />
      </div>

      <TabBar active="reliquary" onTabChange={onTabChange} />
    </div>
  );
}
