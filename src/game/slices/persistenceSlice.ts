import { clearSave, parseSave, suspendPersistence, writeSave } from "../save";
import type { SliceCreator } from "./types";

export type ImportResult = { ok: true } | { ok: false; error: string };

export interface PersistenceSlice {
	importSave: (json: string) => ImportResult;
	resetSave: () => void;
}

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = () => ({
	importSave: (json) => {
		const parsed = parseSave(json);
		if (!parsed.ok) return parsed;

		// Suspend before writing: the tick loop still runs, and an autosave or a
		// finishing catchup would clobber the import before the reload.
		suspendPersistence();

		// Stamp the clock forward, so the reload grants no catchup for the age of the
		// export.
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
