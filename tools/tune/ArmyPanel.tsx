import { UNIT_TYPES } from "../../src/game/data/units";
import type { UnitType } from "../../src/game/types";
import { UNIT_COLORS } from "../../src/ui/theme";
import { type Army, armyTotal } from "./fight";
import { NumberField } from "./NumberField";

interface ArmyPanelProps {
	label: string;
	army: Army;
	onChange: (army: Army) => void;
}

export function ArmyPanel({ label, army, onChange }: ArmyPanelProps) {
	const set = (type: UnitType, value: number) =>
		onChange({ ...army, [type]: Math.max(0, Math.round(value)) });

	return (
		<div>
			<div className="flex items-baseline justify-between">
				<span className="font-display text-[11px] uppercase tracking-[0.2em] text-parchm">
					{label}
				</span>
				<span className="font-mono text-[10px] text-dim">
					{armyTotal(army)} total
				</span>
			</div>
			{UNIT_TYPES.map((type) => (
				<div key={type} className="flex items-center gap-2">
					<span
						className="h-2 w-2 shrink-0 rounded-full"
						style={{ background: UNIT_COLORS[type] }}
					/>
					<div className="flex-1">
						<NumberField
							label={type}
							value={army[type]}
							min={0}
							step={25}
							onChange={(v) => set(type, v)}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
