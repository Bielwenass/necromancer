import { useState } from 'react';
import { useGameStore } from '../../game/store';
import { DUNGEON_DEFS } from '../../game/data/dungeons';
import type { UnitType } from '../../game/types';
import { UnitRow } from './UnitRow';

interface DispatchModalProps {
  dungeonId: string;
  onClose: () => void;
}

const SQUAD_NAMES = [
  // compound single words
  'Coldwhisper', 'Greymarch', 'Boneveil', 'Ashfall',
  'Husklight', 'Dustwake', 'Palebrand', 'Mournhold',
  'Hollowfen', 'Stillblade', 'Quietstep', 'Sallowgate',
  'Witherspoke', 'Ashreach', 'Coldspire', 'Pyrebound',
  'Shroudbound', 'Gravewake', 'Tombwatch', 'Cairnwalk',
  'Brittlebone', 'Crackedjaw', 'Palehand', 'Sootmouth',
  'Ashthroat', 'Greysong', 'Hushblade', 'Mutebell',
  'Marrowstone', 'Boneglass', 'Veilbreak', 'Pyremarch',
  'Hollowstep', 'Coldfall', 'Greyfall', 'Ashbound',
  'Husksworn', 'Pyresworn', 'Mournsworn', 'Coldsworn',

  // adjective + group noun
  'Black Litany', 'Silent Cohort', 'Pale Vigil', 'Sallow Watch',
  'Mute Procession', 'Hush Brigade', 'Sunken Order', 'Withered Few',
  'Ashen Many', 'Grey Throng', 'Long Lament', 'Late Vespers',
  'Last Watch', 'Cold Pall', 'Faded Banner', 'Cracked Choir',
  'Lean Column', 'Stiff Train', 'Quiet Wake', 'Slow Drift',
  'Brittle March', 'Crooked Brigade', 'Lank File', 'Slender Pyre',
  'Forgotten Hand', 'Empty Crown', 'Wan Veil', 'Soot Order',
  'Tallow Train', 'Black Vespers', 'Pale Many', 'Grey Procession',
  'Husked Watch', 'Sallow Few', 'Wormridden Host', 'Maggot Brigade',
  'Carrion Cohort', 'Mould Many', 'Blight Vigil', 'Hollow Crown',

  // necro noun + group noun
  'Bone Verse', 'Marrow Hymn', 'Skull Watch', 'Rib Procession',
  'Sinew Column', 'Pyre Brigade', 'Shroud Cohort', 'Cairn Vigil',
  'Barrow Choir', 'Crypt Order', 'Tomb Tide', 'Grave Hand',
  'Wraith Banner', 'Husk Litany', 'Ash Verse', 'Soot Hymn',
  'Rot Wake', 'Mould Procession', 'Blight Cohort', 'Wither Brigade',
  'Cinder Vigil', 'Dust March', 'Pall Tide', 'Veil Watch',
  'Crow Choir', 'Worm Tide', 'Carrion Order', 'Vulture Cohort',
  'Lich Banner', 'Spectre Train',

  // "X of Y" form
  'Wake of Morn', 'Vigil of Thresh', 'Choir of Yhrun', 'Cohort of Sael',
  'March of Hesh', 'Veil of Karn', 'Hand of Vyrr', 'Watch of Caer',
  'Pall of Vorn', 'Procession of Mournhold', 'Throng of Coldspire',
  'Order of the Pale Crown', 'Litany of the Long Cold',
  'Hymn of the Husked', 'Verse of the Hollow',
  'Banner of the Sallow King', 'Lament of Sael', 'Tide of Vorn',
  'Brigade of Karn', 'Column of Hesh', 'Train of Yhrun',
  'Crown of Vael', 'File of the Forgotten', 'Wake of the Witnessless',
  'Choir of the Witherwood', 'March of the Faded',
  'Order of Empty Hands', 'Watch of the Last Pyre',
  'Cohort of Greyholm', 'Banner of the Mute King',
  'Verse of the Long Cold', 'Hymn of Coldspire', 'Litany of Ash',
  'Drift of Karn', 'Pall of Hesh',

  // numbered (matching Marrow-Eight style + Roman / ordinal variants)
  'Husk-Three', 'Bone-Twelve', 'Pale-Nine', 'Ash-Fourteen',
  'Dust-Seven', 'Rot-Six', 'Cinder-Eleven', 'Wither-Five',
  'Pyre-Two', 'Shroud-Ten', 'Cohort XIII', 'Legion Zero',
  'Choir VI', 'Watch IX', 'Vigil VII', 'Brigade XXII',
  'Column IV', 'Order III', 'The Seventh Hush', 'The Ninth Pall',
  'The Fourth Wake', 'Twelfth Husk', 'Eighteenth Veil',
  'Nineteen Marrow', 'Twenty-Second Pyre',

  // "The [thing]"
  'The Long Cold', 'The Last Breath', 'The Quiet Many',
  'The Slow March', 'The Hollow Few', 'The Witnessless',
  'The Late Vespers', 'The Faded Banner', 'The Pale Crown',
  'The Brittle Hand', 'The Mute Choir', 'The Stilled',
  'The Withering', 'The Husked', 'The Wakeless',
  'The Sleepless March', 'The Patient', 'The Unreturning',
  'The Unburied', 'The Unwept', 'The Unblinking',
  'The Lank Many', 'The Sallow Court', 'The Cold Procession',
  'The Grey Watch', 'The Pale Train',
];

export function DispatchModal({ dungeonId, onClose }: DispatchModalProps) {
  const def = DUNGEON_DEFS[dungeonId];
  const units = useGameStore(s => s.units);
  const derived = useGameStore(s => s.derived);
  const squads = useGameStore(s => s.squads);
  const createSquad = useGameStore(s => s.createSquad);
  const dispatchSquad = useGameStore(s => s.dispatchSquad);

  const idleSquads = squads.filter(s => s.state === 'idle');
  const activeCount = squads.filter(s => s.state !== 'idle').length;
  const atCapacity = activeCount >= derived.maxActiveSquads;

  const [composition, setComposition] = useState<Record<UnitType, number>>({
    skeleton: 0, zombie: 0, wraith: 0,
  });
  const [squadName, setSquadName] = useState(() => SQUAD_NAMES[Math.floor(Math.random() * SQUAD_NAMES.length)]);

  if (!def) return null;

  const totalUnits = composition.skeleton + composition.zombie + composition.wraith;
  const maxSize = derived.maxSquadSize;
  const canCreate = totalUnits > 0 && totalUnits <= maxSize && !atCapacity;

  const adjust = (type: UnitType, delta: number) => {
    setComposition(prev => {
      const available = type === 'skeleton' ? units.skeletons : type === 'zombie' ? units.zombies : units.wraiths;
      const newVal = Math.max(0, Math.min(available, prev[type] + delta, maxSize - totalUnits + prev[type]));
      const newTotal = totalUnits - prev[type] + newVal;
      if (newTotal > maxSize) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const handleCreate = () => {
    if (!canCreate) return;
    const id = createSquad(composition, squadName);
    if (id) dispatchSquad(id, dungeonId);
    onClose();
  };

  const handleSendIdle = (squadId: string) => {
    if (atCapacity) return;
    dispatchSquad(squadId, dungeonId);
    onClose();
  };

  const tierColor = def.tier === 1 ? 'var(--r-uncommon)' : def.tier === 2 ? 'var(--r-rare)' : 'var(--r-epic)';
  const danger = def.tier === 1 ? 'LOW' : def.tier === 2 ? 'MODERATE' : 'HIGH';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cornered" style={{ width: 500, background: 'var(--bg-panel)', border: '1px solid var(--rule-strong)', padding: 28, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.18em' }}>DISPATCH LEGION · TIER {def.tier}</div>
          <div className="display" style={{ fontSize: 22, color: 'var(--ink-bone)', letterSpacing: '0.12em', marginTop: 6 }}>{def.name}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: tierColor }}>DANGER · {danger}</span>
          </div>
        </div>

        {atCapacity && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--hp-crit)', marginBottom: 16, letterSpacing: '0.1em' }}>
            SQUAD LIMIT REACHED · {activeCount}/{derived.maxActiveSquads} ACTIVE
          </div>
        )}

        {idleSquads.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--rule)', marginBottom: 16 }} />
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em', marginBottom: 10 }}>IDLE LEGIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {idleSquads.map(squad => {
                const totalSq = squad.composition.skeleton + squad.composition.zombie + squad.composition.wraith;
                const skLabel = squad.composition.skeleton > 0 ? `${squad.composition.skeleton}sk` : '';
                const zmLabel = squad.composition.zombie > 0 ? `${squad.composition.zombie}zm` : '';
                const wrLabel = squad.composition.wraith > 0 ? `${squad.composition.wraith}wr` : '';
                const compStr = [skLabel, zmLabel, wrLabel].filter(Boolean).join(' ');
                return (
                  <div key={squad.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--rule)', background: 'var(--bg-inset)' }}>
                    <div style={{ flex: 1 }}>
                      <div className="display" style={{ fontSize: 13, color: 'var(--ink-bone)', letterSpacing: '0.14em' }}>{squad.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>×{totalSq} · {compStr}</div>
                    </div>
                    <button
                      onClick={() => handleSendIdle(squad.id)}
                      disabled={atCapacity}
                      style={{
                        padding: '6px 16px',
                        border: `1px solid ${atCapacity ? 'var(--rule)' : 'var(--c-coin)'}`,
                        color: atCapacity ? 'var(--ink-dim)' : 'var(--c-coin)',
                        fontFamily: 'var(--f-display)', fontSize: 10, letterSpacing: '0.2em',
                        background: atCapacity ? 'transparent' : 'rgba(212,168,87,0.05)',
                        cursor: atCapacity ? 'not-allowed' : 'pointer',
                      }}
                    >SEND →</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ height: 1, background: 'var(--rule)', marginBottom: 16 }} />
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em', marginBottom: 14 }}>FORM NEW LEGION</div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em', marginBottom: 6 }}>SQUAD NAME</div>
          <input
            value={squadName}
            onChange={e => setSquadName(e.target.value.trim())}
            style={{
              width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--rule-strong)',
              color: 'var(--ink-bone)', fontFamily: 'var(--f-display)', fontSize: 14,
              letterSpacing: '0.12em', padding: '8px 12px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em' }}>COMPOSITION</span>
            <span className="mono" style={{ fontSize: 10, color: totalUnits > maxSize ? 'var(--hp-crit)' : 'var(--ink-muted)' }}>
              {totalUnits}/{maxSize} UNITS
            </span>
          </div>
          <UnitRow
            type="skeleton" label="Skeleton" color="var(--sq-skeleton)"
            count={composition.skeleton} available={units.skeletons}
            onAdjust={d => adjust('skeleton', d)} maxSize={maxSize} total={totalUnits}
          />
          {derived.zombiesUnlocked && (
            <UnitRow
              type="zombie" label="Zombie" color="var(--sq-zombie)"
              count={composition.zombie} available={units.zombies}
              onAdjust={d => adjust('zombie', d)} maxSize={maxSize} total={totalUnits}
            />
          )}
          {derived.wraithsUnlocked && (
            <UnitRow
              type="wraith" label="Wraith" color="var(--sq-wraith)"
              count={composition.wraith} available={units.wraiths}
              onAdjust={d => adjust('wraith', d)} maxSize={maxSize} total={totalUnits}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', border: '1px solid var(--rule-strong)',
              color: 'var(--ink-muted)', fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}
          >Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{
              flex: 2, padding: '12px 0',
              border: `1px solid ${canCreate ? 'var(--c-coin)' : 'var(--rule)'}`,
              color: canCreate ? 'var(--c-coin)' : 'var(--ink-dim)',
              fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
              background: canCreate ? 'rgba(212,168,87,0.06)' : 'transparent',
              cursor: canCreate ? 'pointer' : 'not-allowed',
            }}
          >Form &amp; Dispatch</button>
        </div>
      </div>
    </div>
  );
}
