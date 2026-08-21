import { summonCost } from "../../../game/rules/summoning";
import { isUnitUnlocked, UNIT_TYPES } from "../../../game/rules/units";
import type { GameState, Squad, Units, UnitType } from "../../../game/types";
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

export function UnitReserves({
	units,
	squads,
	derived,
	resources,
	onSummon,
}: UnitReservesProps) {
	// Summon prices climb with the army, so every row prices itself against live
	// state.
	const summonState = { units, squads, derived };

	const rows = UNIT_TYPES.filter((type) => isUnitUnlocked(type, derived));

	return (
		<div className="px-4 py-3 border-b border-rule bg-bg-panel-2">
			<div className="mono text-[11px] text-dim tracking-[0.14em] mb-2.5">
				UNIT RESERVES
			</div>
			{/* Shared columns, each only as wide as its widest cell, so the rows
			    line up without any of them stretching. Rows lay themselves out
			    against this width, the sidebar being a quarter of the screen on
			    desktop and the whole of it on a phone. */}
			<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2.5 gap-y-2 [container-type:inline-size]">
				{rows.map((type) => (
					<UnitReserveRow
						key={type}
						type={type}
						count={units[type]}
						icon={UNIT_ICONS[type]}
						color={UNIT_COLORS[type]}
						resources={resources}
						costFor={(v) => summonCost(type, v, summonState)}
						onSummon={(v) => onSummon(type, v)}
					/>
				))}
			</div>
		</div>
	);
}
