import React, { useRef, useState, useEffect } from 'react';
import type { Relic, Rarity } from '../../game/types';
import { RELIC_BASES } from '../../game/data/relics';
import { getAffixLabel, formatAffixValue } from '../../game/relics';
import './RelicCard.css';

// ── rarity config ────────────────────────────────────────────────
type RarityConfig = {
  label: string;
  glyph: string;
  color: string;
  deep: string;
  accents: [string, string];
  foilHues: number[];
  glowMul: number;
  foilMul: number;
  edgeAnim: boolean;
};

const RARITIES: Record<Rarity, RarityConfig> = {
  common: {
    label: 'Common',
    glyph: '◇',
    color: '#a8a39a',
    deep: '#3a352e',
    accents: ['#cfc7b8', '#7e7669'],
    foilHues: [40, 60, 30],
    glowMul: 0.20,
    foilMul: 0.15,
    edgeAnim: false,
  },
  uncommon: {
    label: 'Uncommon',
    glyph: '✦',
    color: '#8fb78a',
    deep: '#1f3a26',
    accents: ['#b6d4a6', '#5a8b66'],
    foilHues: [90, 140, 180],
    glowMul: 0.50,
    foilMul: 0.26,
    edgeAnim: false,
  },
  rare: {
    label: 'Rare',
    glyph: '❖',
    color: '#7aa6d6',
    deep: '#15243c',
    accents: ['#a8c8ef', '#4d75ad'],
    foilHues: [180, 220, 270],
    glowMul: 0.63,
    foilMul: 0.45,
    edgeAnim: true,
  },
  epic: {
    label: 'Epic',
    glyph: '☼',
    color: '#b083d6',
    deep: '#2c1a3d',
    accents: ['#d9b8f0', '#7e54a6'],
    foilHues: [260, 350, 300],
    glowMul: 0.85,
    foilMul: 0.75,
    edgeAnim: true,
  },
  legendary: {
    label: 'Legendary',
    glyph: '✺',
    color: '#e08a6a',
    deep: '#3a1612',
    accents: ['#f7c1a0', '#c86249'],
    foilHues: [30, 60, 30, 80, 60, 20,],
    // foilHues: [10, 20],
    // foilHues: [20, 30, 70, 60, 90],
    glowMul: 1.05,
    foilMul: 1.0,
    edgeAnim: true,
  },
};

const RARITY_SIGIL: Record<Rarity, string> = {
  common: 'I',
  uncommon: 'II',
  rare: 'III',
  epic: 'IV',
  legendary: 'V',
};

const SLOT_ART_LABELS: Record<string, string> = {
  crypt: 'CRYPT RELIC',
  skeleton: 'BONE CHARM',
  zombie: 'PLAGUE RELIC',
  wraith: 'SPECTRAL RELIC',
};

// ── tweaks ───────────────────────────────────────────────────────
export interface RelicCardTweaks {
  tilt: number;
  glow: number;
  foil: number;
  gloss: number;
  noise: number;
  idleDrift: boolean;
  edgeShimmer: boolean;
}

const DEFAULT_TWEAKS: RelicCardTweaks = {
  tilt: 12,
  glow: 0.1,
  foil: 0.6,
  gloss: 0.1,
  noise: 0.8,
  idleDrift: true,
  edgeShimmer: true,
};

const VARIANT_TWEAKS: Record<'pull' | 'inventory', Partial<RelicCardTweaks>> = {
  pull:      { tilt: 12, idleDrift: true,  edgeShimmer: true  },
  inventory: { tilt: 12, idleDrift: false, edgeShimmer: false },
};

// ── helpers ──────────────────────────────────────────────────────
function buildFoil(hues: number[], sat: number, light: number, fromDeg: number): string {
  let hs = [...hues];
  if (hs.length === 1) hs = [hs[0], (hs[0] + 60) % 360, hs[0]];
  if (hs[0] !== hs[hs.length - 1]) hs = [...hs, hs[0]];
  const stops = hs.map((h, i) => {
    const pct = (i / (hs.length - 1)) * 100;
    return `oklch(${light}% ${sat} ${h}) ${pct.toFixed(1)}%`;
  }).join(', ');
  return `conic-gradient(from ${fromDeg.toFixed(1)}deg at 50% 50%, ${stops})`;
}

function buildBars(hues: number[], sat: number, light: number): string {
  const bars: string[] = [];
  const step = 100 / hues.length;
  hues.forEach((h, i) => {
    const start = i * step;
    bars.push(`transparent ${start.toFixed(1)}%`);
    bars.push(`oklch(${light}% ${sat} ${h} / 0.7) ${(start + step * 0.25).toFixed(1)}%`);
    bars.push(`oklch(${light}% ${sat} ${h} / 0.7) ${(start + step * 0.45).toFixed(1)}%`);
    bars.push(`transparent ${(start + step * 0.7).toFixed(1)}%`);
  });
  return `repeating-linear-gradient(115deg, ${bars.join(', ')})`;
}

// ── component ────────────────────────────────────────────────────
export interface RelicCardProps {
  relic: Relic;
  /** 'pull' = full card for gacha reveal; 'inventory' = condensed for item grid */
  variant?: 'pull' | 'inventory';
  selected?: boolean;
  tweaks?: Partial<RelicCardTweaks>;
  onClick?: () => void;
}

export function RelicCard({ relic, variant = 'pull', selected = false, tweaks: tweakOverrides, onClick }: RelicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [hovered, setHovered] = useState(false);

  const isLarge = variant === "pull";
  const R = RARITIES[relic.rarity];
  const base = RELIC_BASES.find(b => b.id === relic.baseId);

  const tweaks: RelicCardTweaks = { ...DEFAULT_TWEAKS, ...VARIANT_TWEAKS[variant], ...tweakOverrides };
  const glow  = tweaks.glow  * R.glowMul;
  const foil  = tweaks.foil  * R.foilMul;

  // Derive display data from game Relic
  const name      = base?.name ?? relic.baseId;
  const flavor    = base?.description ? `"${base.description}"` : '';
  const slotKey   = base?.slot ?? 'crypt';
  const setLabel  = base?.set ? ' · ' + base?.set : '';
  const slotLabel = `${slotKey.charAt(0).toUpperCase()}${slotKey.slice(1)}`
  const artLabel  = SLOT_ART_LABELS[slotKey] ?? 'RELIC';
  const sigil     = RARITY_SIGIL[relic.rarity];
  const serial    = `REL-${relic.id.replace(/\D/g, '').slice(0, 4).padStart(4, '0')}`;
  const stats = [
    { k: getAffixLabel(relic.mainAffix.id), v: formatAffixValue(relic.mainAffix.id, relic.mainAffix.value, relic.upgradeLevel) },
    ...relic.minorAffixes.map(a => ({ k: getAffixLabel(a.id), v: formatAffixValue(a.id, a.value, relic.upgradeLevel) })),
  ];

  const setPose = (px: number, py: number) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', `${(-py * tweaks.tilt).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${( px * tweaks.tilt).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(2)}%`);
    el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(2)}%`);
    el.style.setProperty('--bar-x', `${(px * 60).toFixed(1)}%`);
    el.style.setProperty('--bar-y', `${(py * 60).toFixed(1)}%`);
    const fromDeg = (px + 0.5) * 360 + (py + 0.5) * 90;
    const sat = 0.22 + Math.min(0.06, Math.abs(px) * 0.12 + Math.abs(py) * 0.08);
    el.style.setProperty('--foil-bg', buildFoil(R.foilHues, sat, 78, fromDeg));
  };

  // Reset pose when rarity or tilt changes
  useEffect(() => { setPose(0, 0); }, [relic.rarity, tweaks.tilt]);

  // Idle drift when not hovered
  useEffect(() => {
    if (!tweaks.idleDrift || hovered) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      setPose(Math.sin(t * 0.4) * 0.18, Math.cos(t * 0.31) * 0.12);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tweaks.idleDrift, hovered, relic.rarity, tweaks.tilt]);

  const onMove = (e: React.MouseEvent) => {
    const r = cardRef.current!.getBoundingClientRect();
    setPose((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  };

  const onLeave = () => {
    setHovered(false);
    setPose(0, 0);
  };

  const barsBg = buildBars(R.foilHues, 0.22, 70);

  return (
    <div
      className="relic-stage"
      data-rarity={relic.rarity}
      data-variant={variant}
      data-selected={selected ? '1' : '0'}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* outer rarity glow */}
      <div className="relic-glow" style={{
        opacity: glow * (hovered ? 1.0 : 0.55),
        background: `radial-gradient(closest-side, ${R.color}, transparent 70%)`,
      }} />

      <div
        ref={cardRef}
        className="relic-card"
        data-hovered={hovered ? '1' : '0'}
        data-edge-anim={R.edgeAnim && tweaks.edgeShimmer ? '1' : '0'}
        style={{
          '--rarity-color': R.color,
          '--rarity-deep':  R.deep,
          '--accent-1':     R.accents[0],
          '--accent-2':     R.accents[1],
        } as React.CSSProperties}
      >
        <div className="rc-base" />

        {/* iridescence stack */}
        <div className="rc-foil-wrap" style={{ opacity: foil * (hovered ? 1.0 : 0.55) }}>
          <div className="rc-foil rc-foil-spectrum" />
          <div className="rc-foil rc-foil-bars" style={{ backgroundImage: barsBg }} />
          <div className="rc-foil rc-foil-sparkle" />
          <div className="rc-foil rc-foil-burst" />
        </div>

        <div className="rc-noise" style={{ opacity: tweaks.noise }} />

        {/* frame decoration */}
        <svg className="rc-frame" viewBox="0 0 320 460" preserveAspectRatio="none" aria-hidden>
          <rect x="6"  y="6"  width="308" height="448" rx="10" fill="none" stroke="var(--accent-1)" strokeOpacity="0.55" strokeWidth="0.8" />
          <rect x="11" y="11" width="298" height="438" rx="7"  fill="none" stroke="var(--accent-1)" strokeOpacity="0.18" strokeWidth="0.5" />
          {([[16, 16], [304, 16], [16, 444], [304, 444]] as [number, number][]).map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i * 90})`}>
              <path d="M -8 0 L 0 0 L 0 -8" fill="none" stroke="var(--accent-1)" strokeOpacity="0.8" strokeWidth="0.9" />
            </g>
          ))}
          <g transform="translate(160 16)" opacity="0.55">
            <line x1="-40" y1="0" x2="-8"  y2="0" stroke="var(--accent-1)" strokeWidth="0.6" />
            <line x1="8"   y1="0" x2="40"  y2="0" stroke="var(--accent-1)" strokeWidth="0.6" />
            <circle cx="0" cy="0" r="2.2" fill="none" stroke="var(--accent-1)" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="0.6" fill="var(--accent-1)" />
          </g>
          <g transform="translate(160 444)" opacity="0.45">
            <line x1="-30" y1="0" x2="-6" y2="0" stroke="var(--accent-1)" strokeWidth="0.5" />
            <line x1="6"   y1="0" x2="30" y2="0" stroke="var(--accent-1)" strokeWidth="0.5" />
            <path d="M -6 -3 L 0 0 L 6 -3 L 0 3 Z" fill="var(--accent-1)" fillOpacity="0.7" />
          </g>
        </svg>

        <div className="rc-edge-shimmer" />

        {/* content */}
        <div className="rc-content">
          <header className="rc-head">
            <div className="rc-head-l">
              <span className="rc-glyph">{R.glyph}</span>
              <span className="rc-type">{slotLabel}</span>
              {isLarge && <span className="rc-type">{setLabel}</span>}
            </div>
            {isLarge && <span className="rc-rarity-tag">{R.label}</span>}
          </header>

          <div className="rc-art">
            <svg className="rc-art-stripes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <defs>
                <pattern id={`stripes-${relic.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill={`url(#stripes-${relic.id})`} />
            </svg>
            <div className="rc-art-cross"><span /><span /></div>
            <span className="rc-art-label">{artLabel}</span>
            <span className="rc-art-sigil">{sigil}</span>
          </div>

          <div className="rc-title">
            <h2 className={`rc-name text-md ${isLarge ? 'text-2xl' : ''}`}>{name}</h2>
            {flavor && <p className="rc-flavor">{flavor}</p>}
          </div>

          <footer className="rc-foot">
            <ul className="rc-stats">
              {stats.map((s, i) => (
                <li key={i}>
                  <span className="rc-stat-k">{s.k}</span>
                  <span className="rc-stat-dot" />
                  <span className="rc-stat-v">{s.v}</span>
                </li>
              ))}
            </ul>
            <div className="rc-serial">№ {serial}</div>
          </footer>
        </div>

        {/* specular gloss — tracks cursor */}
        <div className="rc-gloss" style={{
          opacity: tweaks.gloss * (hovered ? 1.0 : 0.4),
          background: `radial-gradient(
            circle at var(--mx) var(--my),
            rgba(255,255,255,0.55) 0%,
            rgba(255,255,255,0.10) 18%,
            transparent 42%
          )`,
        }} />

        {/* rim light on edge nearest cursor */}
        <div className="rc-rim" style={{
          opacity: tweaks.gloss * 0.6 * (hovered ? 1 : 0),
          background: `radial-gradient(
            ellipse 60% 60% at var(--mx) var(--my),
            transparent 55%,
            rgba(255,255,255,0.18) 75%,
            transparent 100%
          )`,
        }} />
      </div>
    </div>
  );
}
