import { SLOT_LABELS } from "../../../game/data/relics";
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

const slot = (id: SlotId) => ({ id, label: SLOT_LABELS[id] });

/**
 * The equipped-relic layout: which slots exist, grouped and labelled. Which of
 * them are *open* is `derived.unlockedSlots` — the second slot of every group is
 * bought from the necromancy branch.
 */
export const SLOT_GROUPS: SlotGroup[] = [
	{
		title: "The Crypt",
		slots: [slot("C1"), slot("C2"), slot("C3")],
	},
	{
		title: "Skeleton Summoning Circle",
		unitType: "skeleton",
		slots: [slot("I1"), slot("I2")],
	},
	{
		title: "Zombie Summoning Circle",
		unitType: "zombie",
		slots: [slot("II1"), slot("II2")],
	},
	{
		title: "Wraith Summoning Circle",
		unitType: "wraith",
		slots: [slot("III1"), slot("III2")],
	},
];
