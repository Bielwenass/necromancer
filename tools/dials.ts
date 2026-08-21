import { COMBAT_CONFIG } from "../src/combat/config";

export interface ConfigDial {
	/** Dotted path into `COMBAT_CONFIG`, e.g. `simulation.seekWeight`. */
	path: string;
	/** The value at the time the dial was collected: the reset target. */
	value: number;
	get(): number;
	set(v: number): void;
}

/** Every numeric leaf of an object; the string ones tune nothing measurable. */
export function collectDials(
	obj: Record<string, unknown>,
	prefix = "",
): ConfigDial[] {
	const dials: ConfigDial[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "number") {
			dials.push({
				path,
				value,
				get: () => obj[key] as number,
				set: (v) => {
					obj[key] = v;
				},
			});
		} else if (typeof value === "object" && value !== null) {
			dials.push(...collectDials(value as Record<string, unknown>, path));
		}
	}
	return dials;
}

export function combatDials(): ConfigDial[] {
	return collectDials(COMBAT_CONFIG as unknown as Record<string, unknown>);
}
