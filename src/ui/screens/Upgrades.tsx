import { useState } from 'react';
import { useGameStore } from '../../game/store';
import { UPGRADE_NODES } from '../../game/data/upgrades';
import { canPurchaseUpgrade } from '../../game/upgrades';
import { TopBar } from '../components/TopBar';
import { TabBar } from '../components/TabBar';
import type { TabId } from '../components/TabBar';
import type { UpgradeNode } from '../../game/types';
import { BranchColumn, BRANCHES } from './BranchColumn';
import { NodeDetail } from './NodeDetail';
import { Workshop } from './Workshop';

interface UpgradesProps {
  onTabChange: (tab: TabId) => void;
}

export function Upgrades({ onTabChange }: UpgradesProps) {
  const upgrades = useGameStore(s => s.upgrades);
  const purchased = upgrades.purchased;
  const availablePoints = upgrades.availablePoints;
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade);
  const gameState = useGameStore(s => s);

  const [view, setView] = useState<'tree' | 'workshop'>('tree');
  const [selectedNode, setSelectedNode] = useState<UpgradeNode | null>(null);
  const [filter, setFilter] = useState<'all' | 'affordable' | 'purchased'>('all');

  const totalEarned = availablePoints + purchased.reduce((sum, id) => {
    const node = UPGRADE_NODES.find(n => n.id === id);
    return sum + (node?.cost ?? 0);
  }, 0);
  const spentPoints = totalEarned - availablePoints;

  return (
    <div className="necro">
      <TopBar />

      <div className="upg-subnav">
        <div className={'upg-subnav-tab' + (view === 'tree' ? ' active' : '')} onClick={() => setView('tree')}>Skill Tree</div>
        <div className={'upg-subnav-tab' + (view === 'workshop' ? ' active' : '')} onClick={() => setView('workshop')}>Workshop</div>
      </div>

      <div style={{ position: 'absolute', top: 92, bottom: 60, left: 0, right: 0, display: 'flex' }}>
        {view === 'workshop' && <Workshop />}
        {view === 'tree' && <>
        {/* Left Rail */}
        <div style={{ width: 240, borderRight: '1px solid var(--rule)', background: 'var(--bg-panel)', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <div className="display" style={{ fontSize: 13, color: 'var(--ink-parchm)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>Skill Points</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
              <span className="display" style={{ fontSize: 48, color: 'var(--c-coin)', letterSpacing: '0.04em', lineHeight: 1, filter: 'drop-shadow(0 0 6px rgba(212,168,87,0.25))' }}>
                {availablePoints}
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>AVAILABLE</span>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 6 }}>
              {spentPoints} spent · {totalEarned} earned
            </div>
            <div className="bar-meter" style={{ marginTop: 8, height: 4 }}>
              <i style={{ width: `${totalEarned > 0 ? (spentPoints / totalEarned) * 100 : 0}%`, background: 'var(--c-coin)' }} />
            </div>
          </div>

          <div className="divider-h" />

          <div>
            <div className="display" style={{ fontSize: 11, color: 'var(--ink-parchm)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>By Branch</div>
            <div style={{ marginTop: 10 }}>
              {BRANCHES.map((b, i) => {
                const branchNodes = UPGRADE_NODES.filter(n => n.branch === b.id);
                const p = branchNodes.filter(n => purchased.includes(n.id)).length;
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--rule)' : 'none' }}>
                    <div style={{ width: 8, height: 8, background: b.accent }} />
                    <span style={{ fontSize: 12, color: 'var(--ink-bone)', flex: 1 }}>{b.name}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{p}/{branchNodes.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divider-h" />

          <div>
            <div className="display" style={{ fontSize: 11, color: 'var(--ink-parchm)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Filter</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { l: 'Show All', v: 'all' as const },
                { l: 'Affordable', v: 'affordable' as const },
                { l: 'Purchased', v: 'purchased' as const },
              ].map(o => (
                <div key={o.l} onClick={() => setFilter(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                  <div style={{ width: 10, height: 10, border: '1px solid var(--rule-strong)', background: filter === o.v ? 'var(--ink-parchm)' : 'transparent' }} />
                  <span style={{ fontSize: 11, color: filter === o.v ? 'var(--ink-bone)' : 'var(--ink-muted)' }}>{o.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.12em' }}>
              POINTS EARNED FROM DUNGEON CLEARS
            </div>
          </div>
        </div>

        {/* Center — 3 branch columns */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 50%, #110d08 0%, #0a0805 100%)' }}>
          {BRANCHES.map((b, i) => (
            <BranchColumn
              key={b.id}
              branch={b}
              idx={i}
              purchased={purchased}
              filter={filter}
              availablePoints={availablePoints}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          ))}
        </div>

        {/* Right — node detail */}
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            purchased={purchased}
            availablePoints={availablePoints}
            onPurchase={() => purchaseUpgrade(selectedNode.id)}
            canPurchase={canPurchaseUpgrade(gameState, selectedNode.id)}
          />
        ) : (
          <div style={{ width: 340, borderLeft: '1px solid var(--rule)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.14em', textAlign: 'center' }}>
              SELECT A NODE<br />TO VIEW DETAILS
            </div>
          </div>
        )}
        </>}
      </div>

      <TabBar active="upgrades" onTabChange={onTabChange} />
    </div>
  );
}
