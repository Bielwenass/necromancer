import { UPGRADE_NODES } from '../../game/data/upgrades';
import { NodeIcon } from '../components/Icons';
import { BRANCHES } from './BranchColumn';
import type { UpgradeNode } from '../../game/types';

export function NodeDetail({
  node, purchased, availablePoints, onPurchase, canPurchase,
}: {
  node: UpgradeNode;
  purchased: string[];
  availablePoints: number;
  onPurchase: () => void;
  canPurchase: boolean;
}) {
  const branch = BRANCHES.find(b => b.id === node.branch)!;
  const isPurchased = purchased.includes(node.id);

  const prereqNodes = node.prerequisites.map(id => {
    const n = UPGRADE_NODES.find(u => u.id === id);
    return { id, name: n?.name ?? id, met: purchased.includes(id) };
  });

  const unlockNodes = node.unlocks.map(id => {
    const n = UPGRADE_NODES.find(u => u.id === id);
    return { id, name: n?.name ?? id };
  });

  return (
    <div style={{ width: 340, borderLeft: '1px solid var(--rule)', background: 'var(--bg-panel)', padding: '22px', display: 'flex', flexDirection: 'column' }}>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.18em' }}>
        {node.branch.toUpperCase()} · TIER {node.tier}
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, border: `2px solid ${branch.accent}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
          <NodeIcon kind={node.icon} color={branch.accent} size={28} />
        </div>
        <div>
          <div className="display" style={{ fontSize: 20, color: 'var(--ink-bone)', letterSpacing: '0.12em' }}>{node.name}</div>
          <div className="mono" style={{ fontSize: 10, color: branch.accent, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 }}>
            {branch.name} · Tier {node.tier}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, padding: '14px', border: '1px solid var(--rule)', background: 'var(--bg-inset)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-bone)', lineHeight: 1.5 }}>{node.description}</div>
        {node.flavor && (
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 10, fontStyle: 'italic', letterSpacing: '0.04em' }}>
            "{node.flavor}"
          </div>
        )}
      </div>

      {prereqNodes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>REQUIRES</div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prereqNodes.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: p.met ? branch.accent : 'var(--ink-dim)', fontSize: 11 }}>{p.met ? '✓' : '○'}</span>
                <span style={{ fontSize: 11, color: p.met ? 'var(--ink-bone)' : 'var(--ink-muted)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {unlockNodes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>UNLOCKS</div>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unlockNodes.map(u => (
              <div key={u.id} className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', padding: '3px 8px', border: '1px solid var(--rule-strong)', letterSpacing: '0.08em' }}>
                {u.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>COST</span>
          <span>
            <span className="mono" style={{ fontSize: 18, color: 'var(--c-coin)' }}>{node.cost}</span>{' '}
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.12em' }}>POINTS</span>
          </span>
        </div>
        {isPurchased ? (
          <div style={{
            width: '100%', padding: '12px 0', textAlign: 'center',
            border: `1px solid ${branch.accent}`, color: branch.accent,
            fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase',
          }}>
            OWNED
          </div>
        ) : (
          <button
            onClick={onPurchase}
            disabled={!canPurchase}
            style={{
              width: '100%', padding: '12px 0',
              border: `1px solid ${canPurchase ? branch.accent : 'var(--rule)'}`,
              background: canPurchase ? 'linear-gradient(180deg, rgba(232,220,192,0.05), transparent 80%)' : 'transparent',
              color: canPurchase ? branch.accent : 'var(--ink-dim)',
              fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase',
              cursor: canPurchase ? 'pointer' : 'not-allowed',
            }}
          >
            {!prereqNodes.every(p => p.met) ? 'LOCKED' : availablePoints < node.cost ? 'INSUFFICIENT POINTS' : 'LEARN'}
          </button>
        )}
      </div>
    </div>
  );
}
