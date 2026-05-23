import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../game/store';
import { IconBone, IconCoin, IconSoul } from './Icons';
import { formatNumber, formatRate } from '../theme';
import { clearSave, exportSave, importSave } from '../../game/save';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TopBarProps {
  phase?: string; // kept for API compat, no longer displayed
}

const btnBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 16px',
  border: '1px solid var(--rule-strong)',
  color: 'var(--ink-parchm)',
  fontFamily: 'var(--f-display)',
  fontSize: 11,
  letterSpacing: '0.18em',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left' as const,
  textTransform: 'uppercase' as const,
};

export function TopBar({ phase: _phase }: TopBarProps) {
  const resources = useGameStore(s => s.resources);
  const derived = useGameStore(s => s.derived);
  const meta = useGameStore(s => s.meta);
  const digBone = useGameStore(s => s.digBone);

  const [showSettings, setShowSettings] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bonesPerSec = derived.bonesPerTick * 10;
  const coinsPerSec = derived.coinsPerTick * 10;
  const dayStr = `DAY ${meta.dayCount}`;

  // Close on Escape
  useEffect(() => {
    if (!showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
        setResetConfirm(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings]);

  const openSettings = () => {
    setShowSettings(true);
    setResetConfirm(false);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleReset = () => {
    clearSave();
    window.location.reload();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = importSave(text);
      if (result.ok) {
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => window.location.reload(), 900);
      } else {
        setImportError(result.error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="bar-top">
        <div className="brand">
          <div className="mark" />
          <span>NECROMANCER</span>
        </div>

        {/* Settings button — replaces the phase label */}
        <button
          onClick={openSettings}
          title="Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '4px 12px',
            border: '1px solid var(--rule)',
            borderRadius: 2,
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--ink-muted)',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.color = 'var(--ink-parchm)';
            el.style.borderColor = 'var(--rule-strong)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.color = 'var(--ink-muted)';
            el.style.borderColor = 'var(--rule)';
          }}
        >
          {/* Gear icon */}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          SETTINGS
        </button>

        <div className="meta">
          <span>{dayStr}</span>
          <span style={{ color: 'var(--ink-dim)' }}>T:{meta.tickCount}</span>
        </div>

        <div className="currencies">
          <button
            onClick={digBone}
            title="Dig a bone"
            style={{
              padding: '3px 9px',
              border: '1px solid var(--rule-strong)',
              color: 'var(--c-bone)',
              fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.16em',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              alignSelf: 'center',
            }}
          >
            <IconBone size={10} />
            DIG
          </button>
          <div className="cur">
            <IconBone size={16} />
            <div>
              <div className="lbl">Bones</div>
              <div className="val">
                {formatNumber(resources.bones)}{' '}
                <span className="delta">{bonesPerSec > 0 ? formatRate(derived.bonesPerTick) : '+0/s'}</span>
              </div>
            </div>
          </div>
          <div className="cur">
            <IconCoin size={16} />
            <div>
              <div className="lbl">Coin</div>
              <div className="val">
                {formatNumber(resources.coins)}{' '}
                <span className="delta">{coinsPerSec > 0 ? formatRate(derived.coinsPerTick) : '+0/s'}</span>
              </div>
            </div>
          </div>
          <div className="cur">
            <IconSoul size={16} />
            <div>
              <div className="lbl">Souls</div>
              <div className="val">
                {formatNumber(resources.souls)}{' '}
                <span className="delta">+0/s</span>
              </div>
            </div>
          </div>
          <div className="cur" style={{ opacity: 0.7 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>✦</div>
            <div>
              <div className="lbl">Dust</div>
              <div className="val">{formatNumber(resources.dust)}</div>
            </div>
          </div>
          <div className="cur" style={{ opacity: 0.7 }}>
            <div style={{ fontSize: 12, color: 'var(--sq-zombie)' }}>◈</div>
            <div>
              <div className="lbl">Corpses</div>
              <div className="val">{formatNumber(resources.corpses)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settings modal ─────────────────────────────────────────── */}
      {showSettings && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => { setShowSettings(false); setResetConfirm(false); }}
        >
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--rule-strong)',
              padding: '32px 36px',
              minWidth: 340,
              maxWidth: 400,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div className="display" style={{ fontSize: 13, color: 'var(--ink-parchm)', letterSpacing: '0.28em' }}>
                SETTINGS
              </div>
              <button
                onClick={() => { setShowSettings(false); setResetConfirm(false); }}
                style={{ color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1, padding: '2px 6px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Save data section */}
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.18em',
              color: 'var(--ink-dim)', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Save Data
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <button
                onClick={exportSave}
                style={btnBase}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                ↓ Export Save (JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={btnBase}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                ↑ Import Save (JSON)
              </button>

              {importError && (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--hp-crit)', padding: '6px 0 2px' }}>
                  ✗ {importError}
                </div>
              )}
              {importSuccess && (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--hp-good)', padding: '6px 0 2px' }}>
                  ✓ Imported — reloading…
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0 20px' }} />

            {/* Reset section */}
            {!resetConfirm ? (
              <button
                onClick={() => setResetConfirm(true)}
                style={{ ...btnBase, borderColor: 'rgba(196,90,62,0.35)', color: 'var(--hp-crit)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,90,62,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                ⚠ Reset Save
              </button>
            ) : (
              <div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-muted)',
                  marginBottom: 14, lineHeight: 1.55,
                }}>
                  All progress will be lost.<br />The dead cannot be raised again.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setResetConfirm(false)}
                    style={{ ...btnBase, flex: 1, textAlign: 'center' as const }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    style={{
                      ...btnBase, flex: 1, textAlign: 'center' as const,
                      borderColor: 'var(--hp-crit)', color: 'var(--hp-crit)',
                      background: 'rgba(196,90,62,0.08)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,90,62,0.16)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(196,90,62,0.08)')}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
    </>
  );
}
