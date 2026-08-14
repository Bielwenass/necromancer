import { canAffordCost } from "../../../game/rules/resources";
import { summonCost } from "../../../game/rules/summoning";
import { isUnitUnlocked, UNIT_TYPES } from "../../../game/rules/units";
import type { GameState, Squad, Units, UnitType } from "../../../game/types";
import { formatCost } from "../../format";
import { UNIT_COLORS } from "../../theme";
import { UNIT_ICONS } from "../icons";
import { UnitReserveRow } from "./UnitReserveRow";

interface UnitReservesProps {
	units: Units;
	squads: Squad[];
	derived: GameState["derived"];
	resources: GameState["resources"];
	onSummon: (type: UnitType, count: number) => void;
}

/** The reserve panel: one raise row per unlocked unit type. */
export function UnitReserves({
	units,
	squads,
	derived,
	resources,
	onSummon,
}: UnitReservesProps) {
	// Summon prices climb with the size of the army, so every row has to price
	// itself against live state rather than a fixed table.
	const summonState = { units, squads, derived };

	const rows = UNIT_TYPES.filter((type) => isUnitUnlocked(type, derived));

	return (
		<div className="px-4 py-3 border-b border-rule bg-bg-panel-2">
			<div className="mono text-[11px] text-dim tracking-[0.14em] mb-2.5">
				UNIT RESERVES
			</div>
			<div className="flex flex-col gap-2">
				{rows.map((type) => (
					<UnitReserveRow
						key={type}
						type={type}
						count={units[type]}
						icon={UNIT_ICONS[type]}
						color={UNIT_COLORS[type]}
						canSummon={(v) =>
							canAffordCost(summonCost(type, v, summonState), resources)
						}
						onSummon={() => onSummon(type, 1)}
						costFor={(v) => formatCost(summonCost(type, v, summonState))}
					/>
				))}
			</div>
		</div>
	);
}
