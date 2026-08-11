import type { ComponentType } from "react";
import type { Resources } from "../../../game/types";
import type { ResIcon } from "./cost";

/**
 * A single purchasable line. Every workshop section — skill branches, unit
 * stats, crypt, garden — is a list of these, so one row and one detail body
 * render all of them. Rows the player can't act on yet are dropped while the
 * section is built, so nothing here describes a locked state.
 */
export interface WRow {
	id: string;
	name: string;
	description: string;
	flavor?: string;
	icon: string | ResIcon;
	level: number;
	/** Absent means the row levels forever. */
	maxLevel?: number;
	/** `null` when the row can't be bought with resources (maxed, or skill-point priced). */
	costFn: (level: number) => Partial<Resources> | null;
	valueFn: (level: number) => string;
	nextFn: (level: number) => string;
	/** Detail-panel eyebrow. Defaults to one-time/leveled by pricing. */
	kindLabel?: string;
	/** Detail-panel buy label. Defaults to `Upgrade ➞ LV n`. */
	buyLabel?: (level: number) => string;
	/** Present only on upgrade-tree rows, which cost skill points instead of resources. */
	skill?: { upgradeId: string; cost: number };
}

/** One entry in the side nav, and the pane it renders. */
export interface WSection {
	id: string;
	name: string;
	subtitle: string;
	icon: string | ComponentType;
	unlocked: boolean;
	lockedTitle?: string;
	lockedBody?: string;
	rows: WRow[];
}
