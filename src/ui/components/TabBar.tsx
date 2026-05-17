import React from 'react';
import { IconHex, IconChest, IconSoul, IconTower, IconSkull } from './Icons';

export type TabId = 'crypt' | 'reliquary' | 'ritual' | 'upgrades' | 'codex';

interface TabBarProps {
  active: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; k: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
  { id: 'crypt',     label: 'Crypt',     k: '1', Icon: IconHex },
  { id: 'reliquary', label: 'Reliquary', k: '2', Icon: IconChest },
  { id: 'ritual',    label: 'Ritual',    k: '3', Icon: IconSoul },
  { id: 'upgrades',  label: 'Upgrades',  k: '4', Icon: IconTower },
  { id: 'codex',     label: 'Codex',     k: '5', Icon: IconSkull },
];

export function TabBar({ active, onTabChange }: TabBarProps) {
  return (
    <div className="bar-tabs">
      {TABS.map(t => {
        const isActive = t.id === active;
        return (
          <div
            key={t.id}
            className={`tab${isActive ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange(t.id)}
          >
            <t.Icon size={24} color={isActive ? 'var(--c-coin)' : 'var(--ink-muted)'} />
            <span className='text-lg'>{t.label}</span>
            <span className="key">{t.k}</span>
          </div>
        );
      })}
    </div>
  );
}
