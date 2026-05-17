import { useGameStore } from '../../game/store';
import { IconBone, IconCoin, IconSoul } from './Icons';
import { formatNumber, formatRate } from '../theme';

interface TopBarProps {
  phase?: string;
}

export function TopBar({ phase = 'PHASE I · ASCENDANCY' }: TopBarProps) {
  const resources = useGameStore(s => s.resources);
  const derived = useGameStore(s => s.derived);
  const meta = useGameStore(s => s.meta);

  const bonesPerSec = derived.bonesPerTick * 10;
  const coinsPerSec = derived.coinsPerTick * 10;

  const dayStr = `DAY ${meta.dayCount}`;

  return (
    <div className="bar-top">
      <div className="brand">
        <div className="mark" />
        <span>NECROMANCER</span>
      </div>
      <div className="phase">
        <span className="pip" />
        <span>{phase}</span>
      </div>
      <div className="meta">
        <span>{dayStr}</span>
        <span style={{ color: 'var(--ink-dim)' }}>T:{meta.tickCount}</span>
      </div>
      <div className="currencies">
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
  );
}
