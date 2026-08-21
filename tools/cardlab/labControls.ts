import { RELIC_BASES } from "../../src/game/data/relics";
import type { Rarity } from "../../src/game/types";
import {
	DEFAULT_TWEAKS,
	type RelicCardTweaks,
} from "../../src/ui/components/reliquary/RelicCard";

type KeysOfType<T, V> = {
	[K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

export type TweakNumberKey = KeysOfType<RelicCardTweaks, number>;
export type TweakBoolKey = KeysOfType<RelicCardTweaks, boolean>;

export type LabView = "front" | "back" | "reveal";

export interface LabState {
	view: LabView;
	baseId: string;
	rarity: Rarity;
	/** One card per rarity instead of one card, for side-by-side tuning. */
	allRarities: boolean;
	variant: "pull" | "inventory";
	/** Repeats of the whole roll, for watching many cards animate at once. */
	copies: number;
	cardWidth: number;
	stagger: number;
	tweaks: RelicCardTweaks;
}

export const INITIAL_LAB: LabState = {
	view: "front",
	baseId: RELIC_BASES[0].id,
	rarity: "legendary",
	allRarities: true,
	variant: "pull",
	copies: 1,
	cardWidth: 280,
	stagger: 500,
	tweaks: DEFAULT_TWEAKS,
};

export interface SliderSpec {
	key: TweakNumberKey;
	label: string;
	min: number;
	max: number;
	step: number;
	suffix?: string;
}

export const MATERIAL_SLIDERS: SliderSpec[] = [
	{ key: "tilt", label: "Tilt", min: 0, max: 30, step: 0.5, suffix: "°" },
	{ key: "foil", label: "Foil", min: 0, max: 2, step: 0.01 },
	{ key: "noise", label: "Noise", min: 0, max: 1, step: 0.01 },
];

export const FLIP_SLIDER: SliderSpec = {
	key: "revealDuration",
	label: "Flip",
	min: 200,
	max: 3000,
	step: 10,
	suffix: "ms",
};

export const TWEAK_TOGGLES: { key: TweakBoolKey; label: string }[] = [
	{ key: "idleDrift", label: "Idle drift" },
	{ key: "edgeShimmer", label: "Edge shimmer" },
];
