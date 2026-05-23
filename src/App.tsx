import { useEffect, useState } from 'react';
import { useGameLifecycle } from './game/useGameLifecycle';
import { CryptMap } from './ui/screens/CryptMap';
import { Reliquary } from './ui/screens/Reliquary';
import { Ritual } from './ui/screens/Ritual';
import { Upgrades } from './ui/screens/Upgrades';
import { Codex } from './ui/screens/Codex';
import { clearSave } from './game/save';

type TabId = 'crypt' | 'reliquary' | 'ritual' | 'upgrades' | 'codex';

export default function App() {
  const { catchup, dismissCatchup } = useGameLifecycle();
  const [activeTab, setActiveTab] = useState<TabId>('crypt');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      // Dismiss catchup overlay when done
      if (catchup?.done && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) {
        e.preventDefault();
        dismissCatchup();
        return;
      }
      switch (e.key) {
        case '1': setActiveTab('crypt'); break;
        case '2': setActiveTab('reliquary'); break;
        case '3': setActiveTab('ritual'); break;
        case '4': setActiveTab('upgrades'); break;
        case '5': setActiveTab('codex'); break;
        case 'Escape': setShowResetConfirm(false); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [catchup?.done, dismissCatchup]);

  const handleReset = () => {
    clearSave();
    window.location.reload();
  };

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-canvas)', position: 'relative' }}>
      {activeTab === 'crypt' && <CryptMap onTabChange={setActiveTab} />}
      {activeTab === 'reliquary' && <Reliquary onTabChange={setActiveTab} />}
      {activeTab === 'ritual' && <Ritual onTabChange={setActiveTab} />}
      {activeTab === 'upgrades' && <Upgrades onTabChange={setActiveTab} />}
      {activeTab === 'codex' && <Codex onTabChange={setActiveTab} />}

      {/* Reset save button */}
      <button
        onClick={() => setShowResetConfirm(true)}
        style={{
          position: 'fixed', bottom: 70, right: 16,
          padding: '4px 10px',
          border: '1px solid var(--rule)',
          color: 'var(--ink-dim)',
          fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.12em',
          background: 'var(--bg-panel)',
          zIndex: 50,
        }}
      >
        RESET SAVE
      </button>

      {/* Offline catchup overlay */}
      {catchup !== null && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 500,
        }}>
          <div className="display" style={{ color: 'var(--ink-bone)', fontSize: 13, letterSpacing: '0.22em', marginBottom: 18 }}>
            {catchup.done ? 'CAUGHT UP' : 'CATCHING UP...'}
          </div>

          <div style={{ width: 240, height: 2, background: 'var(--rule)', marginBottom: 24 }}>
            <div style={{ width: `${catchup.progress * 100}%`, height: '100%', background: 'var(--ink-bone)', transition: 'width 0.1s linear' }} />
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
            {[
              { label: 'BONES', value: catchup.stats.bonesGained },
              { label: 'COINS', value: catchup.stats.coinsGained },
              { label: 'SOULS', value: catchup.stats.soulsGained },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', minWidth: 52 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 14, color: 'var(--ink-bone)' }}>
                  +{value.toLocaleString()}
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.1em', marginTop: 3 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.08em', marginBottom: catchup.done ? 24 : 0 }}>
            {catchup.stats.eventsProcessed} events processed
          </div>

          {catchup.done && (
            <button
              onClick={dismissCatchup}
              style={{
                padding: '8px 28px',
                border: '1px solid var(--ink-bone)',
                color: 'var(--ink-bone)',
                background: 'transparent',
                fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em',
                cursor: 'pointer',
              }}
            >
              CONTINUE
            </button>
          )}
        </div>
      )}

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--rule-strong)',
            padding: 32, maxWidth: 400,
            textAlign: 'center',
          }}>
            <div className="display" style={{ fontSize: 18, color: 'var(--ink-bone)', letterSpacing: '0.16em', marginBottom: 16 }}>
              Reset Save?
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              All progress will be lost. The dead cannot be raised again.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowResetConfirm(false)} style={{
                padding: '10px 24px',
                border: '1px solid var(--rule-strong)',
                color: 'var(--ink-muted)',
                fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em',
              }}>CANCEL</button>
              <button onClick={handleReset} style={{
                padding: '10px 24px',
                border: '1px solid var(--hp-crit)',
                color: 'var(--hp-crit)',
                fontFamily: 'var(--f-display)', fontSize: 11, letterSpacing: '0.22em',
                background: 'rgba(196,90,62,0.08)',
              }}>RESET</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
