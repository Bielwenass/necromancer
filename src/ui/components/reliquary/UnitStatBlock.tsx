import { effectiveUnitStats } from "../../../combat/dungeonCombat";
import type { GameState, UnitType } from "../../../game/types";

interface UnitStatBlockProps {
	unitType: UnitType;
	derived: GameState["derived"];
}

/**
 * The flat stat and its relic/upgrade bonus, per unit type.
 *
 * The total comes from `effectiveUnitStats`, the same function that builds the
 * combat side, and the bonus is the remainder, so `flat + bonus` is the number
 * the engine fights with. Deriving the two halves here is how the panel and the
 * engine drift apart.
 */
export function UnitStatBlock({ unitType, derived }: UnitStatBlockProps) {
	const d = derived[unitType];
	const eff = effectiveUnitStats(derived, unitType);
	const hundredths = (n: number) => Math.floor(n * 100) / 100;

	const stats = [
		{
			label: "HP",
			flat: Math.floor(d.hpFlat),
			bonus: Math.floor(eff.hp) - Math.floor(d.hpFlat),
		},
		{
			label: "Damage",
			flat: Math.floor(d.dmgFlat),
			bonus: Math.floor(eff.dmg) - Math.floor(d.dmgFlat),
		},
		{
			label: "Speed",
			flat: hundredths(d.speedFlat),
			bonus: hundredths(eff.speed - d.speedFlat),
		},
	];

	return (
		<div className="flex flex-col mono uppercase text-sm mb-4">
			{stats.map(({ label, flat, bonus }) => (
				<div key={label}>
					<span className="text-muted">{label}:</span> {flat} (+{bonus})
				</div>
			))}
		</div>
	);
}
