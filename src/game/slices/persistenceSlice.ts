import { clearSave, parseSave, suspendPersistence, writeSave } from "../save";
import type { SliceCreator } from "./types";

export type ImportResult = { ok: true } | { ok: false; error: string };

export interface PersistenceSlice {
	/** Validate and install an exported save. The caller reloads on success. */
	importSave: (json: string) => ImportResult;
	/** Wipe the save. The caller reloads. */
	resetSave: () => void;
}

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = () => ({
	importSave: (json) => {
		const parsed = parseSave(json);
		if (!parsed.ok) return parsed;

		// Suspend before writing: the tick loop is still running, and an autosave
		// or a finishing offline catchup would otherwise clobber the import during
		// the moment between here and the page reload.
		suspendPersistence();

		// Stamp the clock forward so the reload treats the import as "just played"
		// rather than granting offline catchup for however long ago it was exported.
		writeSave({
			...parsed.state,
			meta: { ...parsed.state.meta, lastTickAt: Date.now() },
		});
		return { ok: true };
	},

	resetSave: () => {
		suspendPersistence();
		clearSave();
	},
});
