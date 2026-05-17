import { useGameStore } from '../../game/store';
import { DUNGEON_DEFS } from '../../game/data/dungeons';
import { TopBar } from '../components/TopBar';
import { TabBar } from '../components/TabBar';
import type { TabId } from '../components/TabBar';
import { HPBar } from '../components/HPBar';
import { NecroticSurge } from '../components/NecroticSurge';
import { DispatchModal } from '../components/DispatchModal';
import { CombatWindow } from '../components/CombatWindow';
import { formatTime } from '../theme';
import { useState, useEffect } from 'react';
import { DungeonCard, squadColor, squadHpPct } from './DungeonCard';
import { UnitReserve } from './UnitReserve';

interface CryptMapProps {
  onTabChange: (tab: TabId) => void;
}

export function CryptMap({ onTabChange }: CryptMapProps) {
  const squads = useGameStore(s => s.squads);
  const dungeons = useGameStore(s => s.dungeons);
  const units = useGameStore(s => s.units);
  const derived = useGameStore(s => s.derived);
  const resources = useGameStore(s => s.resources);
  const summonUnits = useGameStore(s => s.summonUnits);
  const recallSquad = useGameStore(s => s.recallSquad);
  const deleteSquad = useGameStore(s => s.deleteSquad);

  const [dispatchTarget, setDispatchTarget] = useState<string | null>(null);
  const [watchedSquadId, setWatchedSquadId] = useState<string | null>(null);

  useEffect(() => {
    const fightingIds = squads.filter(s => s.state === 'fighting').map(s => s.id);
    if (watchedSquadId !== null && !fightingIds.includes(watchedSquadId)) {
      setWatchedSquadId(fightingIds[0] ?? null);
    } else if (watchedSquadId === null && fightingIds.length > 0) {
      setWatchedSquadId(fightingIds[0]);
    }
  }, [squads, watchedSquadId]);

  return (
    <div className="necro" style={{ fontSize: 16 }}>
      <TopBar />

      <div className="stage">
        {/* Dungeon List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {(() => {
            const visible: typeof DUNGEON_DEFS = [];
            let foundLocked = false;
            for (const def of DUNGEON_DEFS) {
              const ds = dungeons.find(d => d.id === def.id);
              if (!ds) continue;
              if (ds.unlocked) { visible.push(def); }
              else if (!foundLocked) { visible.push(def); foundLocked = true; }
            }
            return visible.map(def => {
              const ds = dungeons.find(d => d.id === def.id)!;
              return (
                <DungeonCard
                  key={def.id} def={def} ds={ds} squads={squads}
                  onDispatch={id => setDispatchTarget(id)}
                />
              );
            });
          })()}
        </div>

        {/* Right Sidebar */}
        <div style={{ width: 380, background: 'var(--bg-panel)', borderLeft: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
          {/* Unit reserves */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', background: 'var(--bg-panel-2)' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', letterSpacing: '0.14em', marginBottom: 10 }}>UNIT RESERVES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <UnitReserve type="skeleton" count={units.skeletons} color="var(--sq-skeleton)"
                canSummon={resources.bones >= Math.round(10 * (1 - derived.summonCostBonus))}
                onSummon={() => summonUnits('skeleton', 1)}
                cost={`${Math.round(10 * (1 - derived.summonCostBonus))} bones`}
              />
              {derived.zombiesUnlocked && (
                <UnitReserve type="zombie" count={units.zombies} color="var(--sq-zombie)"
                  canSummon={resources.bones >= 5 && resources.corpses >= 1}
                  onSummon={() => summonUnits('zombie', 1)}
                  cost="5 bones + 1 corpse"
                />
              )}
              {derived.wraithsUnlocked && (
                <UnitReserve type="wraith" count={units.wraiths} color="var(--sq-wraith)"
                  canSummon={resources.bones >= 20 && resources.souls >= 1}
                  onSummon={() => summonUnits('wraith', 1)}
                  cost="20 bones + 1 soul"
                />
              )}
            </div>
          </div>

          {/* Combat Window */}
          {(() => {
            if (!watchedSquadId) return null;
            const watchedSquad = squads.find(s => s.id === watchedSquadId && s.state === 'fighting');
            if (!watchedSquad?.targetDungeonId) return null;
            const dungeonDef = DUNGEON_DEFS.find(d => d.id === watchedSquad.targetDungeonId);
            if (!dungeonDef) return null;
            return (
              <div style={{ borderBottom: '1px solid var(--rule)', background: '#0A0A0F', flexShrink: 0 }}>
                <div className="panel-h" style={{ padding: '6px 16px' }}>
                  <div className="ttl" style={{ fontSize: 11 }}>BATTLE · {dungeonDef.name.toUpperCase()}</div>
                </div>
                <CombatWindow squad={watchedSquad} def={dungeonDef} />
              </div>
            );
          })()}

          {/* Active Legions */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="panel-h">
              <div className="ttl">Active Legions</div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
                {squads.filter(s => s.state !== 'idle').length}/{derived.maxActiveSquads}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {squads.length === 0 && (
                <div style={{ padding: 28, textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--ink-dim)' }}>NO SQUADS · CLICK A DUNGEON</div>
                </div>
              )}
              {squads.map((squad, i) => {
                const def = squad.targetDungeonId ? DUNGEON_DEFS.find(d => d.id === squad.targetDungeonId) : null;
                const hpPct = squadHpPct(squad);
                const totalUnits = squad.composition.skeleton + squad.composition.zombie + squad.composition.wraith;
                const color = squadColor(squad);
                const eta = squad.state === 'traveling'
                  ? formatTime(Math.round((1 - squad.position) * (def?.travelTimeTicks ?? 100)))
                  : squad.state === 'returning'
                  ? formatTime(Math.round(squad.position * (def?.travelTimeTicks ?? 100)))
                  : '—';

                return (
                  <div key={squad.id} style={{
                    padding: '14px 16px', borderBottom: '1px solid var(--rule)',
                    display: 'flex', gap: 12, alignItems: 'center',
                    background: i % 2 === 0 ? 'rgba(212,184,140,0.01)' : 'transparent',
                  }}>
                    {squad.id}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      border: '1px solid var(--rule-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', flexShrink: 0,
                    }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
                      {totalUnits > 0 && (
                        <div className="mono" style={{
                          position: 'absolute', bottom: -5, right: -5,
                          fontSize: 10, color: 'var(--ink-bone)',
                          background: 'var(--bg-inset)', border: '1px solid var(--rule)', padding: '0 3px',
                        }}>×{totalUnits}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div className="display" style={{ fontSize: 14, color: 'var(--ink-bone)', letterSpacing: '0.16em' }}>
                          {squad.name}
                        </div>
                        {squad.state === 'idle' && (
                          <button
                            onClick={() => deleteSquad(squad.id)}
                            style={{
                              padding: '2px 8px', border: '1px solid var(--rule-strong)',
                              color: 'var(--hp-crit)', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em',
                            }}
                          >DISBAND</button>
                        )}
                        {squad.state !== 'idle' && squad.state !== 'returning' && (
                          <button
                            onClick={() => recallSquad(squad.id)}
                            style={{
                              padding: '2px 8px', border: '1px solid var(--rule-strong)',
                              color: 'var(--ink-dim)', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.1em',
                            }}
                          >RECALL</button>
                        )}
                      </div>
                      <div className="mono" style={{
                        fontSize: 12,
                        color: squad.state === 'idle' ? 'var(--ink-dim)' : squad.state === 'returning' ? 'var(--c-coin)' : 'var(--ink-muted)',
                        marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {squad.state === 'idle' ? '○ Idle' :
                         squad.state === 'returning' ? `⇠ ${def?.name ?? '?'}` :
                         squad.state === 'fighting' ? `⚔ ${def?.name ?? '?'}` :
                         `→ ${def?.name ?? '?'}`}
                      </div>
                      {squad.state !== 'idle' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <HPBar pct={hpPct} w={120} />
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{Math.round(hpPct * 100)}%</span>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginLeft: 'auto' }}>{eta}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <NecroticSurge />
        </div>
      </div>

      <TabBar active="crypt" onTabChange={onTabChange} />

      {dispatchTarget && (
        <DispatchModal
          dungeonId={dispatchTarget}
          onClose={() => setDispatchTarget(null)}
        />
      )}
    </div>
  );
}
