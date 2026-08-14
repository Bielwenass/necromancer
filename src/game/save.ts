import type { GameState } from "./types";

const SAVE_KEY = "necromancer_save_v1";
/**
 * Bumped whenever a save's meaning changes. A mismatch makes `loadGame` return
 * null and the game start fresh, keeping hydration free of migration code.
 */
const SAVE_VERSION = 6;

/**
 * Slices written to disk; `derived` is recomputed. Exported so offline catchup
 * installs exactly what persistence considers state.
 */
export const PERSISTED_KEYS = [
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
 * Set once the app commits to replacing the save and reloading. The ~1s before
 * the reload still ticks and would overwrite it. One-way.
 */
let persistenceSuspended = false;

export function suspendPersistence(): void {
	persistenceSuspended = true;
}

function serialize(state: SavedState): string {
	const out: Record<string, unknown> = { version: SAVE_VERSION };
	for (const key of PERSISTED_KEYS) out[key] = state[key];
	return JSON.stringify(out);
}

export function saveGame(state: GameState): void {
	if (persistenceSuspended) return;
	try {
		localStorage.setItem(SAVE_KEY, serialize(state));
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
	a.download = `Necromancer Export ${saveFileStamp()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export type ParseResult =
	| { ok: true; state: SavedState }
	| { ok: false; error: string };

/** Validate an exported save. Pure; writing it is the store's job. */
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
	localStorage.setItem(SAVE_KEY, serialize(state));
}
