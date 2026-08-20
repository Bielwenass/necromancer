import { COMBAT_CONFIG } from "./config";
import { radiusScale } from "./simulation";
import {
	type DeathFlash,
	SIDE_A,
	type Side,
	type SideConfig,
	type SimUnits,
} from "./types";

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	units: SimUnits,
	typeNames: string[],
	configs: Partial<Record<Side, SideConfig>>,
	deathFlashes: DeathFlash[],
	t: number,
	extrapolationDt: number = 0,
): void {
	const rcfg = COMBAT_CONFIG.rendering;

	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = rcfg.backgroundColor;
	ctx.fillRect(0, 0, width, height);

	// Colour per side per type, resolved once rather than searched per unit.
	const colors: string[][] = [[], []];
	for (const [side, sideId] of [
		["a", SIDE_A],
		["b", 1],
	] as const) {
		const config = configs[side];
		for (let ti = 0; ti < typeNames.length; ti++) {
			colors[sideId][ti] =
				config?.units.find((e) => e.name === typeNames[ti])?.color ?? "#888";
		}
	}

	// Dots track the collision footprint, so what you see is what resolves apart.
	const dotRadius = rcfg.dotRadius * radiusScale(units.count);

	const n = units.count;
	for (let i = 0; i < n; i++) {
		const ex =
			extrapolationDt > 0
				? Math.max(
						0,
						Math.min(width, units.x[i] + units.vx[i] * extrapolationDt),
					)
				: units.x[i];
		const ey =
			extrapolationDt > 0
				? Math.max(
						0,
						Math.min(height, units.y[i] + units.vy[i] * extrapolationDt),
					)
				: units.y[i];
		ctx.fillStyle = colors[units.side[i]][units.typeId[i]];
		ctx.beginPath();
		ctx.arc(ex, ey, dotRadius, 0, Math.PI * 2);
		ctx.fill();
	}

	const flashMs = rcfg.deathFlashMs;
	for (const flash of deathFlashes) {
		const age = t - flash.t;
		const progress = age / flashMs;
		const alpha = 1 - progress;
		const radius = 3 * (1 - progress * 0.5);
		const r = 255;
		const g = Math.floor(255 * (1 - progress) + 140 * progress);
		const b = Math.floor(255 * (1 - progress));
		ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
		ctx.beginPath();
		ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
		ctx.fill();
	}
}
