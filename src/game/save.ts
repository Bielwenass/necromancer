import type { GameState } from "./types";

const SAVE_KEY = "necromancer_save_v1";
/**
 * Bumped when a save's *meaning* changes, not just its shape. Both bumps so far
 * were upgrade-tree reworks that reused node ids for different effects — an
 * older save would silently grant the wrong upgrades rather than fail. A
 * mismatch makes `loadGame` return null and the game starts fresh.
 */
const SAVE_VERSION = 3;

/** Slices written to disk. `derived` is deliberately absent — it is recomputed. */
const PERSISTED_KEYS = [
	"resources",
	"workshop",
	"units",
	"squads",
	"dungeons",
	"relics",
	"upgrades",
	"gacha",
	"meta",
] as const;

export type SavedState = Omit<GameState, "derived">;

/**
 * Set once the app has committed to replacing the save and reloading (import or
 * reset). Those write localStorage and then wait ~1s for the reload while the
 * simulation keeps running, so without this an autosave or a finishing offline
 * catchup would overwrite the bytes just written. One-way by design.
 */
let persistenceSuspended = false;

export function suspendPersistence(): void {
	persistenceSuspended = true;
}

export function saveGame(state: GameState): void {
	if (persistenceSuspended) return;
	try {
		const toSave: Record<string, unknown> = { version: SAVE_VERSION };
		for (const key of PERSISTED_KEYS) toSave[key] = state[key];
		localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
	} catch (e) {
		console.warn("Save failed:", e);
	}
}

export function loadGame(): SavedState | null {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		if (parsed.version !== SAVE_VERSION) return null;
		return parsed as unknown as SavedState;
	} catch {
		return null;
	}
}

export function clearSave(): void {
	localStorage.removeItem(SAVE_KEY);
}

/** Local date/time as "YYYY-MM-DD HH:MM" (24h). */
function saveFileStamp(now = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
	return `${date} ${time}`;
}

export function exportSave(): void {
	const raw = localStorage.getItem(SAVE_KEY);
	if (!raw) return;
	const blob = new Blob([raw], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `Necromancer Save ${saveFileStamp()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export type ParseResult =
	| { ok: true; state: SavedState }
	| { ok: false; error: string };

/** Validate an exported save. Pure — writing it is the store's job. */
export function parseSave(json: string): ParseResult {
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(json) as Record<string, unknown>;
	} catch {
		return { ok: false, error: "Invalid JSON." };
	}
	if (parsed.version !== SAVE_VERSION) {
		return {
			ok: false,
			error: `Version mismatch (expected ${SAVE_VERSION}, got ${parsed.version ?? "unknown"}).`,
		};
	}
	for (const key of PERSISTED_KEYS) {
		if (!(key in parsed)) return { ok: false, error: `Missing field: ${key}` };
	}
	return { ok: true, state: parsed as unknown as SavedState };
}

/** Write a validated save straight to disk, bypassing the suspend guard. */
export function writeSave(state: SavedState): void {
	const toSave: Record<string, unknown> = { version: SAVE_VERSION };
	for (const key of PERSISTED_KEYS) toSave[key] = state[key];
	localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
}
