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
	const perSec = perTick * 10;
	if (perSec === 0) return "+0/s";
	return `+${perSec.toFixed(1)}/s`;
}

/** Ticks as a bare seconds count — one decimal only when it isn't a whole second. */
export function formatSeconds(ticks: number): string {
	const seconds = Math.round(ticks) / 10;
	return seconds.toFixed(Number.isInteger(seconds) ? 0 : 1);
}

export function formatTime(ticks: number): string {
	const seconds = Math.ceil(ticks / 10);
	if (seconds < 60) return `0:${String(seconds).padStart(2, "0")}`;
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes}:${String(secs).padStart(2, "0")}`;
}
