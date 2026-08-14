import { COMBAT_CONFIG } from "./config";
import type { DeathFlash, Side, SideConfig, SimUnit } from "./types";

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	units: SimUnit[],
	configs: Partial<Record<Side, SideConfig>>,
	deathFlashes: DeathFlash[],
	t: number,
	extrapolationDt: number = 0,
): void {
	const rcfg = COMBAT_CONFIG.rendering;

	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = rcfg.backgroundColor;
	ctx.fillRect(0, 0, width, height);

	// Draw individual units
	for (const unit of units) {
		const sideConfig = configs[unit.side];
		if (!sideConfig) continue;
		const color =
			sideConfig.units.find((e) => e.name === unit.type)?.color ?? "#888";
		const ex =
			extrapolationDt > 0
				? Math.max(0, Math.min(width, unit.x + unit.vx * extrapolationDt))
				: unit.x;
		const ey =
			extrapolationDt > 0
				? Math.max(0, Math.min(height, unit.y + unit.vy * extrapolationDt))
				: unit.y;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(ex, ey, rcfg.dotRadius, 0, Math.PI * 2);
		ctx.fill();
	}

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
