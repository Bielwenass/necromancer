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

      <div className="stage items-center justify-center flex-col gap-8">
        {/* Decorative hex pattern */}
        <svg className="absolute inset-0 opacity-[0.04] pointer-events-none" width="1920" height="960">
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

        <div className="flex gap-10 opacity-30">
          {[0, 1, 2].map(i => <IconSoul key={i} size={24} color="var(--c-soul)" />)}
        </div>

        <div className="text-center z-[1]">
          <div className="mono text-xs text-soul tracking-[0.48em] mb-4">PHASE III · DOMINION</div>
          <div className="display text-[64px] text-bone !tracking-[0.24em] uppercase leading-none">Soul Codex</div>
          <div className="w-20 h-px bg-soul mx-auto my-6 opacity-50" />
          <div className="font-body italic text-base text-parchm leading-[1.7] max-w-[600px] mx-auto">
            The souls of the departed await binding.<br />
            Their names are not yet spoken.<br />
            Their deeds are not yet recorded.
          </div>
          <div className="mono text-xs text-dim !tracking-[0.32em] mt-8">— COMING SOON —</div>
        </div>

        <div className="z-[1] px-8 py-4 border border-rule bg-bg-panel max-w-[480px] text-center">
          <div className="mono text-[10px] text-muted tracking-[0.18em] mb-2">UNLOCKS UPON ASCENSION</div>
          <div className="flex gap-6 justify-center">
            {['Clear Ossuary of Vael', 'Reach 500 souls', 'Purchase Apotheosis'].map((req, i) => (
              <div key={i} className="flex items-center gap-[6px]">
                <span className="text-dim text-xs">○</span>
                <span className="text-xs text-muted">{req}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 opacity-[0.15] z-[1]">
          {Array.from({ length: 5 }).map((_, i) => <IconHex key={i} size={20} color="var(--c-soul)" />)}
        </div>
      </div>

      <TabBar active="codex" onTabChange={onTabChange} />
    </div>
  );
}
