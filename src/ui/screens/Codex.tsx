import { TopBar } from '../components/TopBar';
import { TabBar } from '../components/TabBar';
import type { TabId } from '../components/TabBar';
import { IconSoul, IconHex } from '../components/Icons';

interface CodexProps {
  onTabChange: (tab: TabId) => void;
}

export function Codex({ onTabChange }: CodexProps) {
  return (
    <div className="necro">
      <TopBar phase="PHASE III · DOMINION" />

      <div className="stage" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
        {/* Decorative SVG hex pattern */}
        <svg style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }} width="1920" height="960">
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 12 }).map((_, col) => {
              const x = col * 160 + (row % 2 === 0 ? 0 : 80);
              const y = row * 140;
              const pts = Array.from({ length: 6 }).map((__, i) => {
                const a = (Math.PI / 3) * i;
                return `${x + 60 * Math.cos(a)},${y + 60 * Math.sin(a)}`;
              }).join(' ');
              return (
                <polygon key={`${row}-${col}`} points={pts}
                  fill="none" stroke="var(--c-soul)" strokeWidth="1" />
              );
            })
          )}
        </svg>

        {/* Soul wisps floating */}
        <div style={{ display: 'flex', gap: 40, opacity: 0.3 }}>
          {[0, 1, 2].map(i => (
            <IconSoul key={i} size={24} color="var(--c-soul)" />
          ))}
        </div>

        {/* Main content */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--c-soul)', letterSpacing: '0.48em', marginBottom: 16 }}>
            PHASE III · DOMINION
          </div>
          <div className="display" style={{ fontSize: 64, color: 'var(--ink-bone)', letterSpacing: '0.24em', textTransform: 'uppercase', lineHeight: 1 }}>
            Soul Codex
          </div>
          <div style={{ width: 80, height: 1, background: 'var(--c-soul)', margin: '24px auto', opacity: 0.5 }} />
          <div style={{ fontFamily: 'var(--f-body)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-parchm)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            The souls of the departed await binding.<br />
            Their names are not yet spoken.<br />
            Their deeds are not yet recorded.
          </div>
          <div className="mono" style={{ marginTop: 32, fontSize: 12, color: 'var(--ink-dim)', letterSpacing: '0.32em' }}>
            — COMING SOON —
          </div>
        </div>

        {/* Phase II requirement note */}
        <div style={{
          zIndex: 1,
          padding: '16px 32px',
          border: '1px solid var(--rule)',
          background: 'var(--bg-panel)',
          maxWidth: 480, textAlign: 'center',
        }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.18em', marginBottom: 8 }}>
            UNLOCKS UPON ASCENSION
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            {['Clear Ossuary of Vael', 'Reach 500 souls', 'Purchase Apotheosis'].map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--ink-dim)', fontSize: 11 }}>○</span>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{req}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hex icon decoration */}
        <div style={{ display: 'flex', gap: 16, opacity: 0.15, zIndex: 1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <IconHex key={i} size={20} color="var(--c-soul)" />
          ))}
        </div>
      </div>

      <TabBar active="codex" onTabChange={onTabChange} />
    </div>
  );
}
