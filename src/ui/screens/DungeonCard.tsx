import type { DungeonDef, DungeonState, Squad } from '../../game/types';
import { HPBar } from '../components/HPBar';
import { formatTime } from '../theme';

export function tierColor(tier: 1 | 2 | 3 | 4): string {
  if (tier === 4) return 'var(--r-epic)';
  if (tier === 3) return 'var(--r-rare)';
  if (tier === 2) return 'var(--r-uncommon)';
  return 'var(--ink-dim)';
}

export function squadColor(squad: Squad): string {
  if (squad.composition.wraith > 0) return 'var(--sq-wraith)';
  if (squad.composition.zombie > 0) return 'var(--sq-zombie)';
  return 'var(--sq-skeleton)';
}

export function squadHpPct(squad: Squad): number {
  const cur = squad.currentHp.skeleton + squad.currentHp.zombie + squad.currentHp.wraith;
  const max = squad.composition.skeleton * 10 + squad.composition.zombie * 25 + squad.composition.wraith * 6;
  if (max === 0) return 1;
  return Math.max(0, Math.min(1, cur / max));
}

export function DungeonCard({ def, ds, squads, onDispatch }: {
  def: DungeonDef; ds: DungeonState; squads: Squad[]; onDispatch: (id: string) => void;
}) {
  const fightingSquad = squads.find(s => s.targetDungeonId === def.id && s.state === 'fighting');
  const travelingSquad = squads.find(s => s.targetDungeonId === def.id && s.state === 'traveling');
  const returningSquad = squads.find(s => s.targetDungeonId === def.id && s.state === 'returning');
  const activeSquad = fightingSquad ?? travelingSquad ?? returningSquad;

  const locked = !ds.unlocked;
  const hpPct = activeSquad ? squadHpPct(activeSquad) : 1;
  const totalUnits = activeSquad
    ? activeSquad.composition.skeleton + activeSquad.composition.zombie + activeSquad.composition.wraith
    : 0;

  const eta = activeSquad?.state === 'traveling'
    ? formatTime(Math.round((1 - activeSquad.position) * def.travelTimeTicks))
    : activeSquad?.state === 'returning'
    ? formatTime(Math.round(activeSquad.position * def.travelTimeTicks))
    : null;

  const clearMult = (1 + Math.sqrt(ds.clearCount + 1) * 0.07);
  const clearMultDisplay = clearMult.toFixed(2);

  return (
    <div
      onClick={() => !locked && onDispatch(def.id)}
      style={{
        position: 'relative', height: 140, flexShrink: 0, borderBottom: '1px solid var(--rule)',
        overflow: 'hidden', cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.55 : 1,
      }}
    >
      <div style={{ position: 'relative', padding: '0 32px', height: '100%', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{
          flexShrink: 0, border: `1px solid ${tierColor(def.tier)}`,
          padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span className="mono" style={{ fontSize: 11, color: tierColor(def.tier), letterSpacing: '0.2em' }}>TIER</span>
          <span className="display" style={{ fontSize: 20, color: tierColor(def.tier) }}>{def.tier}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{
            fontSize: 20, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 7,
            color: locked ? 'var(--ink-muted)' : 'var(--ink-bone)',
          }}>
            {def.name}
          </div>
          {locked ? (
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', letterSpacing: '0.12em' }}>
              SEALED — {def.unlockCondition}
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <span>{def.travelTimeTicks / 10}s travel</span>
              <span>{Math.floor(def.lootTable.bonesMin * clearMult)}–{Math.floor(def.lootTable.bonesMax * clearMult)} bones</span>
              <span>{Math.floor(def.lootTable.coinsMin * clearMult)}–{Math.floor(def.lootTable.coinsMax * clearMult)} coins</span>
              <span>{(def.lootTable.soulChance * 100).toFixed(0)}% soul</span>
              {ds.clearCount > 0 && (
                <>
                  <span style={{ color: 'var(--c-coin)' }}>{ds.clearCount}× cleared</span>
                  <span>x{clearMultDisplay} clear mult</span>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, minWidth: 260, textAlign: 'right' }}>
          {activeSquad ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 7 }}>
                <span className="display" style={{ fontSize: 15, color: 'var(--ink-parchm)', letterSpacing: '0.16em' }}>
                  {activeSquad.name}
                </span>
                <span className="mono" style={{ fontSize: 13, color: squadColor(activeSquad) }}>×{totalUnits}</span>
              </div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 9 }}>
                {activeSquad.state === 'traveling' && eta ? `→ TRAVELING · ${eta}` :
                 activeSquad.state === 'fighting' ? '⚔ FIGHTING' :
                 eta ? `⇠ RETURNING · ${eta}` : '⇠ RETURNING'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <HPBar pct={hpPct} w={150} />
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{Math.round(hpPct * 100)}%</span>
              </div>
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 14, color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>
              {locked ? 'SEALED' : 'AVAILABLE'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
