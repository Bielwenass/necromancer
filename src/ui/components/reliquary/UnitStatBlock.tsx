import type { GameState, UnitType } from "../../../game/types";

interface UnitStatBlockProps {
	unitType: UnitType;
	derived: GameState["derived"];
}

/**
 * The flat stat and its relic/upgrade bonus, per unit type. Both halves come
 * straight from `derived`, so this always reflects what combat will use.
 */
export function UnitStatBlock({ unitType, derived }: UnitStatBlockProps) {
	const d = derived[unitType];
	const hundredths = (n: number) => Math.floor(n * 100) / 100;

	const stats = [
		{
			label: "HP",
			flat: Math.floor(d.hpFlat),
			bonus: Math.floor(d.hpFlat * d.hpBonus),
		},
		{
			label: "Damage",
			flat: Math.floor(d.dmgFlat),
			bonus: Math.floor(d.dmgFlat * d.dmgBonus),
		},
		{
			label: "Speed",
			flat: hundredths(d.speedFlat),
			bonus: hundredths(d.speedFlat * d.speedBonus),
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
