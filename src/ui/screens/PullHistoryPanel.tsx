import { useGameStore } from '../../game/store';
import { RELIC_BASES } from '../../game/data/relics';
import { rarityColor } from '../theme';
import type { Rarity } from '../../game/types';
import { RelicGlyph } from '../components/RelicGlyph';

function getGlyph(baseId: string): string {
  return RELIC_BASES.find(b => b.id === baseId)?.glyph ?? 'hex';
}

function getBaseName(baseId: string): string {
  return RELIC_BASES.find(b => b.id === baseId)?.name ?? baseId;
}

export function PullHistoryPanel() {
  const pullHistory = useGameStore(s => s.gacha.pullHistory);
  const sessionTotals = useGameStore(s => s.gacha.sessionTotals);

  return (
    <div style={{ width: 260, height: '100%', background: 'var(--bg-panel)', borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-h">
        <div className="ttl">Pull History</div>
        <span className="act">LAST 50</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }} className='max-h-100'>
        {pullHistory.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>NO PULLS YET</div>
          </div>
        )}
        {pullHistory.map((p, i) => {
          const c = rarityColor(p.rarity);
          const glyph = getGlyph(p.relicName);
          const name = getBaseName(p.relicName);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderBottom: '1px solid var(--rule)',
              background: i === 0 ? 'rgba(212,168,87,0.04)' : 'transparent',
            }}>
              <div style={{ width: 30, height: 30, border: `1px solid ${c}`, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RelicGlyph kind={glyph} size={18} color={c} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-bone)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div className="mono" style={{ fontSize: 9, color: c, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                  {p.rarity} · {p.poolId}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--rule)' }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em', marginBottom: 8 }}>
          SESSION TOTALS · {Object.values(sessionTotals).reduce((s, n) => s + n, 0)} PULLS
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => (
            <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div className="mono" style={{ fontSize: 11, color: rarityColor(r) }}>{sessionTotals[r]}</div>
              <div style={{ width: '100%', height: 2, background: rarityColor(r), marginTop: 2, opacity: 0.6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
