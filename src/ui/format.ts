import { TICKS_PER_SECOND } from "../game/data/pacing";

export function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
	return Math.floor(n).toLocaleString();
}

/** A resource cost as prose: `"48 bones + 1 corpse"`. */
export function formatCost(cost: Partial<Record<string, number>>): string {
	return Object.entries(cost)
		.filter(([, amount]) => amount !== undefined)
		.map(
			([key, amount]) =>
				`${amount} ${amount === 1 ? key.replace(/s$/, "") : key}`,
		)
		.join(" + ");
}

export function formatRate(perTick: number): string {
	const perSec = perTick * TICKS_PER_SECOND;
	if (perSec === 0) return "+0/s";
	return `+${perSec.toFixed(1)}/s`;
}

export function formatSeconds(ticks: number): string {
	const seconds = Math.round(ticks) / TICKS_PER_SECOND;
	return seconds.toFixed(Number.isInteger(seconds) ? 0 : 1);
}

export function formatTime(ticks: number): string {
	const seconds = Math.ceil(ticks / TICKS_PER_SECOND);
	if (seconds < 60) return `0:${String(seconds).padStart(2, "0")}`;
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes}:${String(secs).padStart(2, "0")}`;
}
