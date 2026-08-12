import type { SlotId, UnitType } from "../../../game/types";

export interface SlotGroup {
	title: string;
	slots: { id: SlotId; label: string }[];
	/**
	 * Present when the group belongs to a summoning circle, which gates the
	 * group behind that unit's unlock and gives it a stat block.
	 */
	unitType?: UnitType;
}

/** The equipped-relic layout: which slots exist, grouped and labelled. */
export const SLOT_GROUPS: SlotGroup[] = [
	{
		title: "The Crypt",
		slots: [
			{ id: "C1", label: "C-I" },
			{ id: "C2", label: "C-II" },
			{ id: "C3", label: "C-III" },
		],
	},
	{
		title: "Skeleton Summoning Circle",
		unitType: "skeleton",
		slots: [
			{ id: "I1", label: "S-I" },
			{ id: "I2", label: "S-II" },
		],
	},
	{
		title: "Zombie Summoning Circle",
		unitType: "zombie",
		slots: [
			{ id: "II1", label: "Z-I" },
			{ id: "II2", label: "Z-II" },
		],
	},
	{
		title: "Wraith Summoning Circle",
		unitType: "wraith",
		slots: [
			{ id: "III1", label: "W-I" },
			{ id: "III2", label: "W-II" },
		],
	},
];
