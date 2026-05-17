import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../game/store';
import { POOL_CONFIGS } from '../../game/gacha';
import { IconBone, IconCoin, IconSoul } from '../components/Icons';
import { rarityColor, rarityName, formatNumber } from '../theme';
import type { PoolId, Relic, Rarity } from '../../game/types';
import { RelicGlyph } from '../components/RelicGlyph';
import { RevealOverlay } from './RevealOverlay';

const POOL_META: Record<PoolId, {
  name: string; kicker: string; blurb: string; glyph: string;
  accent: string; premium: boolean; featured: boolean;
  pityMax: number; pityGuaranteed: Rarity | null;
}> = {
  bone: {
    name: 'Bone Ritual', kicker: 'I · ATTUNED',
    blurb: 'A simple summons. The graveyards yield bones, the bones yield more.',
    glyph: 'hex', accent: 'var(--c-bone)', premium: false, featured: false,
    pityMax: 0, pityGuaranteed: null,
  },
  soul: {
    name: 'Soul Ritual', kicker: 'II · BOUND',
    blurb: 'Wisps of the recently-departed coalesce around the brazier.',
    glyph: 'star', accent: 'var(--c-soul)', premium: false, featured: true,
    pityMax: 20, pityGuaranteed: 'rare',
  },
  forbidden: {
    name: 'Forbidden Ritual', kicker: 'III · BLASPHEMOUS',
    blurb: 'Names that should not be spoken. The price is steep; the rewards, ruinous.',
    glyph: 'moon', accent: 'var(--c-coin)', premium: true, featured: false,
    pityMax: 50, pityGuaranteed: 'legendary',
  },
};

export function RitualPanel({ poolId }: { poolId: PoolId }) {
  const meta = POOL_META[poolId];
  const config = POOL_CONFIGS[poolId];
  const resources = useGameStore(s => s.resources);
  const pull = useGameStore(s => s.pull);
  const clearLastPulled = useGameStore(s => s.clearLastPulled);
  const lastPulledRelics = useGameStore(s => s.gacha.lastPulledRelics);
  const pityCounter = useGameStore(s => s.gacha.pityCounters[poolId]);

  const [revealRelics, setRevealRelics] = useState<Relic[]>([]);
  const [myPullPending, setMyPullPending] = useState(false);

  const cost1 = config.cost1.amount;
  const cost10 = config.cost10.amount;
  const resource = config.cost1.resource;

  const available = resource === 'bones' ? resources.bones
    : resource === 'coins' ? resources.coins
    : resources.souls;

  const canPull1 = available >= cost1;
  const canPull10 = available >= cost10;

  const doPull = (count: 1 | 10) => {
    if (count === 1 && !canPull1) return;
    if (count === 10 && !canPull10) return;
    clearLastPulled();
    setMyPullPending(true);
    pull(poolId, count);
  };

  useEffect(() => {
    if (myPullPending && lastPulledRelics && lastPulledRelics.length > 0) {
      setRevealRelics(lastPulledRelics);
      setMyPullPending(false);
    }
  }, [lastPulledRelics, myPullPending]);

  const ResourceIcon = resource === 'bones' ? IconBone : resource === 'coins' ? IconCoin : IconSoul;

  return (
    <div style={{
      flex: 1, borderRight: '1px solid var(--rule)',
      background: meta.featured
        ? 'linear-gradient(180deg, #1a140d 0%, #0e0b07 70%)'
        : 'linear-gradient(180deg, #15110b 0%, #0e0b07 80%)',
      padding: '32px 28px', display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {meta.premium && (
        <>
          {[0, 1, 2, 3].map(i => {
            const pos: React.CSSProperties = i === 0 ? { top: 12, left: 12 } : i === 1 ? { top: 12, right: 12 } : i === 2 ? { bottom: 12, left: 12 } : { bottom: 12, right: 12 };
            return (
              <div key={i} style={{
                position: 'absolute', ...pos, width: 18, height: 18,
                borderTop: i < 2 ? `1px solid ${meta.accent}` : 'none',
                borderBottom: i >= 2 ? `1px solid ${meta.accent}` : 'none',
                borderLeft: i % 2 === 0 ? `1px solid ${meta.accent}` : 'none',
                borderRight: i % 2 === 1 ? `1px solid ${meta.accent}` : 'none',
              }} />
            );
          })}
        </>
      )}

      <div className="mono" style={{ fontSize: 10, color: meta.accent, letterSpacing: '0.32em', opacity: 0.85 }}>{meta.kicker}</div>
      <div className="display" style={{ fontSize: 32, color: 'var(--ink-bone)', letterSpacing: '0.18em', marginTop: 12, textTransform: 'uppercase' }}>{meta.name}</div>
      <div style={{ width: 60, height: 1, background: meta.accent, marginTop: 14, opacity: 0.6 }} />
      <div style={{ fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--ink-parchm)', fontStyle: 'italic', marginTop: 16, lineHeight: 1.5 }}>{meta.blurb}</div>

      <div style={{
        marginTop: 28, height: 180, border: `1px solid ${meta.accent}`,
        background: 'radial-gradient(ellipse at 50% 60%, rgba(212,168,87,0.04), transparent 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', opacity: 0.95,
      }} className="cornered">
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="50%" cy="50%" r="60" fill="none" stroke={meta.accent} strokeWidth="1" opacity="0.18" />
          <circle cx="50%" cy="50%" r="80" fill="none" stroke={meta.accent} strokeWidth="1" opacity="0.10" strokeDasharray="3 5" />
        </svg>
        <RelicGlyph kind={meta.glyph} size={80} color={meta.accent} />
        <div className="mono" style={{ position: 'absolute', top: 10, left: 12, fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.14em' }}>
          {poolId.toUpperCase()} POOL
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="display" style={{ fontSize: 10, color: 'var(--ink-parchm)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Drop Odds</span>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)' }}>BASE</span>
        </div>
        <div style={{ display: 'flex', height: 6, marginBottom: 8 }}>
          {config.odds.map((o, i) => (
            <div key={i} style={{ width: `${o.weight}%`, background: rarityColor(o.rarity), opacity: 0.85 }} />
          ))}
        </div>
        {config.odds.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', padding: '3px 0', borderBottom: i < config.odds.length - 1 ? '1px solid var(--rule)' : 'none' }}>
            <span style={{ width: 8, height: 8, background: rarityColor(o.rarity), marginRight: 8, display: 'inline-block' }} />
            <span className="mono" style={{ fontSize: 11, color: rarityColor(o.rarity), letterSpacing: '0.12em', textTransform: 'uppercase' }}>{rarityName(o.rarity)}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-bone)', marginLeft: 'auto' }}>
              {o.weight.toFixed(1)}<span style={{ color: 'var(--ink-dim)' }}>%</span>
            </span>
          </div>
        ))}
      </div>

      {meta.pityGuaranteed && meta.pityMax > 0 && (
        <div style={{ marginTop: 18, padding: '12px 14px', border: '1px solid var(--rule-strong)', background: 'var(--bg-inset)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.16em' }}>PITY COUNTER</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-bone)' }}>
              {pityCounter}<span style={{ color: 'var(--ink-dim)' }}>/{meta.pityMax}</span>
            </span>
          </div>
          <div className="bar-meter" style={{ height: 5 }}>
            <i style={{ width: `${(pityCounter / meta.pityMax) * 100}%`, background: rarityColor(meta.pityGuaranteed) }} />
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-parchm)' }}>
              {meta.pityMax - pityCounter} to guaranteed{' '}
            </span>
            <span className="mono" style={{ fontSize: 10, color: rarityColor(meta.pityGuaranteed), letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {rarityName(meta.pityGuaranteed)}
            </span>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', gap: 10 }}>
        <button
          onClick={() => doPull(1)} disabled={!canPull1}
          style={{
            flex: 1, padding: '14px 0',
            border: `1px solid ${canPull1 ? meta.accent : 'var(--rule)'}`,
            background: 'transparent', color: canPull1 ? meta.accent : 'var(--ink-dim)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            cursor: canPull1 ? 'pointer' : 'not-allowed',
          }}
        >
          <span className="display" style={{ fontSize: 12, letterSpacing: '0.28em' }}>PULL</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ResourceIcon size={14} color={canPull1 ? meta.accent : 'var(--ink-dim)'} />
            <span className="mono" style={{ fontSize: 12 }}>{formatNumber(cost1)}</span>
          </span>
        </button>
        <button
          onClick={() => doPull(10)} disabled={!canPull10}
          style={{
            flex: 1.2, padding: '14px 0',
            border: `1px solid ${canPull10 ? meta.accent : 'var(--rule)'}`,
            background: meta.featured
              ? 'linear-gradient(180deg, rgba(155,122,214,0.08), transparent 80%)'
              : `linear-gradient(180deg, rgba(212,168,87,0.06), transparent 80%)`,
            color: canPull10 ? 'var(--ink-bone)' : 'var(--ink-dim)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            position: 'relative', cursor: canPull10 ? 'pointer' : 'not-allowed',
          }}
        >
          <span className="display" style={{ fontSize: 12, letterSpacing: '0.28em', color: canPull10 ? meta.accent : 'var(--ink-dim)' }}>PULL × 10</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ResourceIcon size={14} color={canPull10 ? meta.accent : 'var(--ink-dim)'} />
            <span className="mono" style={{ fontSize: 12 }}>{formatNumber(cost10)}</span>
          </span>
          <span className="mono" style={{ position: 'absolute', top: 6, right: 8, fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>+1 BONUS</span>
        </button>
      </div>

      {revealRelics.length > 0 && (
        <RevealOverlay relics={revealRelics} onClose={() => { setRevealRelics([]); clearLastPulled(); }} />
      )}
    </div>
  );
}
