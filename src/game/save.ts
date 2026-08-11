import type { GameState } from "./types";

const SAVE_KEY = "necromancer_save_v1";
const SAVE_VERSION = 1;

export function saveGame(state: GameState): void {
	try {
		const toSave = {
			resources: state.resources,
			workshop: state.workshop,
			units: state.units,
			squads: state.squads,
			dungeons: state.dungeons,
			relics: state.relics,
			upgrades: state.upgrades,
			gacha: {
				pityCounters: state.gacha.pityCounters,
				lastPulledRelics: state.gacha.lastPulledRelics,
			},
			meta: state.meta,
			version: SAVE_VERSION,
		};
		localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
	} catch (e) {
		console.warn("Save failed:", e);
	}
}

export function loadGame(): Omit<GameState, "derived"> | null {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (parsed.version !== SAVE_VERSION) return null;
		return parsed as unknown as Omit<GameState, "derived">;
	} catch {
		return null;
	}
}

export function hasSave(): boolean {
	return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSave(): void {
	localStorage.removeItem(SAVE_KEY);
}

export function exportSave(): void {
	const raw = localStorage.getItem(SAVE_KEY);
	if (!raw) return;
	const blob = new Blob([raw], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `necromancer_save_${Date.now()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

type ImportResult = { ok: true } | { ok: false; error: string };

export function importSave(json: string): ImportResult {
	try {
		const parsed = JSON.parse(json) as Record<string, unknown>;
		if (parsed.version !== SAVE_VERSION) {
			return {
				ok: false,
				error: `Version mismatch (expected ${SAVE_VERSION}, got ${parsed.version ?? "unknown"}).`,
			};
		}
		const required = [
			"resources",
			"workshop",
			"units",
			"squads",
			"dungeons",
			"relics",
			"upgrades",
			"gacha",
			"meta",
		];
		for (const key of required) {
			if (!(key in parsed))
				return { ok: false, error: `Missing field: ${key}` };
		}
		localStorage.setItem(SAVE_KEY, json);
		return { ok: true };
	} catch {
		return { ok: false, error: "Invalid JSON." };
	}
}
