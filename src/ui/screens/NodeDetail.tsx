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
    <div className="w-[340px] border-l border-rule bg-bg-panel p-[22px] flex flex-col">
      <div className="mono text-[9px] text-dim tracking-[0.18em]">
        {node.branch.toUpperCase()} · TIER {node.tier}
      </div>

      <div className="mt-4 flex items-center gap-[14px]">
        <div
          className="w-14 h-14 border-2 rounded-full flex items-center justify-center bg-bg-canvas"
          style={{ borderColor: branch.accent }}
        >
          <NodeIcon kind={node.icon} color={branch.accent} size={28} />
        </div>
        <div>
          <div className="display text-xl text-bone !tracking-[0.12em]">{node.name}</div>
          <div className="mono text-[10px] tracking-[0.16em] uppercase mt-0.5" style={{ color: branch.accent }}>
            {branch.name} · Tier {node.tier}
          </div>
        </div>
      </div>

      <div className="mt-[18px] p-[14px] border border-rule bg-bg-inset">
        <div className="text-xs text-bone leading-[1.5]">{node.description}</div>
        {node.flavor && (
          <div className="mono text-[10px] text-dim mt-[10px] italic tracking-[0.04em]">
            "{node.flavor}"
          </div>
        )}
      </div>

      {prereqNodes.length > 0 && (
        <div className="mt-[18px]">
          <div className="mono text-[9px] text-dim tracking-[0.16em]">REQUIRES</div>
          <div className="mt-[6px] flex flex-col gap-1">
            {prereqNodes.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: p.met ? branch.accent : 'var(--ink-dim)' }}>{p.met ? '✓' : '○'}</span>
                <span className="text-xs" style={{ color: p.met ? 'var(--ink-bone)' : 'var(--ink-muted)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {unlockNodes.length > 0 && (
        <div className="mt-[18px]">
          <div className="mono text-[9px] text-dim tracking-[0.16em]">UNLOCKS</div>
          <div className="mt-[6px] flex flex-wrap gap-[6px]">
            {unlockNodes.map(u => (
              <div key={u.id} className="mono text-[10px] text-muted px-2 py-[3px] border border-rule-strong tracking-[0.08em]">
                {u.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-[18px]">
        <div className="flex justify-between items-baseline mb-2">
          <span className="mono text-[9px] text-dim tracking-[0.16em]">COST</span>
          <span>
            <span className="mono text-lg text-coin">{node.cost}</span>{' '}
            <span className="mono text-[10px] text-muted tracking-[0.12em]">POINTS</span>
          </span>
        </div>

        {isPurchased ? (
          <div
            className="w-full py-3 text-center border display text-xs !tracking-[0.28em] uppercase"
            style={{ borderColor: branch.accent, color: branch.accent }}
          >
            OWNED
          </div>
        ) : (
          <button
            onClick={onPurchase}
            disabled={!canPurchase}
            className="!w-full !py-3 !border display !text-xs !tracking-[0.28em] !uppercase"
            style={{
              borderColor: canPurchase ? branch.accent : 'var(--rule)',
              background:  canPurchase ? 'linear-gradient(180deg, rgba(232,220,192,0.05), transparent 80%)' : 'transparent',
              color:       canPurchase ? branch.accent : 'var(--ink-dim)',
              cursor:      canPurchase ? 'pointer' : 'not-allowed',
            }}
          >
            {!prereqNodes.every(p => p.met) ? 'LOCKED' : availablePoints < node.cost ? 'INSUFFICIENT POINTS' : 'LEARN'}
          </button>
        )}
      </div>
    </div>
  );
}
