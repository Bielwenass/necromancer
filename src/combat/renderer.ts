import type { UnitA, Side, SideConfig, DeathFlash } from './types';
import { COMBAT_CONFIG } from './config';

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  units: UnitA[],
  configs: Partial<Record<Side, SideConfig>>,
  deathFlashes: DeathFlash[],
  t: number,
): void {
  const rcfg = COMBAT_CONFIG.rendering;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = rcfg.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw individual units
  for (const unit of units) {
    const sideConfig = configs[unit.side];
    if (!sideConfig) continue;
    const color = sideConfig.units.find(e => e.name === unit.type)?.color ?? '#888';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, rcfg.dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Death flashes
  const flashMs = rcfg.deathFlashMs;
  for (const flash of deathFlashes) {
    const age = t - flash.t;
    const progress = age / flashMs;
    const alpha = 1 - progress;
    const radius = 4 * (1 - progress * 0.5);
    const r = 255;
    const g = Math.floor(255 * (1 - progress) + 140 * progress);
    const b = Math.floor(255 * (1 - progress));
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
