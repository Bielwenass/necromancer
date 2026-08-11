import type { GameState } from "../game/types";
import type { SideConfig } from "./types";

export const COMBAT_W = 360;
export const COMBAT_H = 180;

const PLAYER_COLORS = {
	skeleton: "#D4B88C",
	zombie: "#7A9E6E",
	wraith: "#9B7ED4",
};

export function buildAttackerConfig(
	composition: Record<"skeleton" | "zombie" | "wraith", number>,
	derived: GameState["derived"],
): SideConfig {
	const statsByUnit = {
		skeleton: {
			hp: derived.skeleton.hpFlat * (1 + derived.skeleton.hpBonus),
			dmg: derived.skeleton.dmgFlat * (1 + derived.skeleton.dmgBonus),
			speed: derived.skeleton.speedFlat * (1 + derived.skeleton.speedBonus),
		},
		zombie: {
			hp: derived.zombie.hpFlat * (1 + derived.zombie.hpBonus),
			dmg: derived.zombie.dmgFlat * (1 + derived.zombie.dmgBonus),
			speed: derived.zombie.speedFlat * (1 + derived.zombie.speedBonus),
		},
		wraith: {
			hp: derived.wraith.hpFlat * (1 + derived.wraith.hpBonus),
			dmg: derived.wraith.dmgFlat * (1 + derived.wraith.dmgBonus),
			speed: derived.wraith.speedFlat * (1 + derived.wraith.speedBonus),
		},
	};

	return {
		units: Object.entries(composition).map(([key, value]) => {
			return {
				name: key,
				amount: value,
				stats: statsByUnit[key as "skeleton" | "zombie" | "wraith"],
				color: PLAYER_COLORS[key as "skeleton" | "zombie" | "wraith"],
			};
		}),
		spawnArea: { x: 10, y: 10, w: 55, h: COMBAT_H - 20 },
	};
}

export type CombatOutcome = {
	winner: "a" | "b" | "draw";
	survivorsByType: Record<string, number>;
};
