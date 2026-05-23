import { useEffect, useState } from 'react';
import { useGameLifecycle } from './game/useGameLifecycle';
import { CryptMap } from './ui/screens/CryptMap';
import { Reliquary } from './ui/screens/Reliquary';
import { Ritual } from './ui/screens/Ritual';
import { Upgrades } from './ui/screens/Upgrades';
import { Codex } from './ui/screens/Codex';

type TabId = 'crypt' | 'reliquary' | 'ritual' | 'upgrades' | 'codex';

export default function App() {
  const { catchup, dismissCatchup } = useGameLifecycle();
  const [activeTab, setActiveTab] = useState<TabId>('crypt');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      // Dismiss catchup overlay when done
      if (catchup?.done && (e.key === 'Enter' || e.key === ' ')) {
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
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [catchup?.done, dismissCatchup]);

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-canvas)', position: 'relative' }}>
      {activeTab === 'crypt' && <CryptMap onTabChange={setActiveTab} />}
      {activeTab === 'reliquary' && <Reliquary onTabChange={setActiveTab} />}
      {activeTab === 'ritual' && <Ritual onTabChange={setActiveTab} />}
      {activeTab === 'upgrades' && <Upgrades onTabChange={setActiveTab} />}
      {activeTab === 'codex' && <Codex onTabChange={setActiveTab} />}

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

    </div>
  );
}
