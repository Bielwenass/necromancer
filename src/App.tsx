import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from './game/store';
import { useCombatWorkers } from './game/useCombatWorkers';
import { CryptMap } from './ui/screens/CryptMap';
import { Reliquary } from './ui/screens/Reliquary';
import { Ritual } from './ui/screens/Ritual';
import { Upgrades } from './ui/screens/Upgrades';
import { Codex } from './ui/screens/Codex';
import { clearSave } from './game/save';

type TabId = 'crypt' | 'reliquary' | 'ritual' | 'upgrades' | 'codex';

export default function App() {
  useCombatWorkers();
  const [activeTab, setActiveTab] = useState<TabId>('crypt');
  const tick = useGameStore(s => s.tick);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }
    const deltaMs = Math.min(timestamp - lastTimeRef.current, 200); // cap at 200ms
    lastTimeRef.current = timestamp;

    tick(deltaMs);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [tick]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
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
  }, []);

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
