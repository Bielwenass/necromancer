import { isUndying } from "../../../game/rules/units";
import type { UnitType } from "../../../game/types";
import { Button } from "../common/Button";
import { UnitDot } from "../common/UnitDot";

export function UnitCountStepper({
	type,
	label,
	color,
	count,
	available,
	onAdjust,
	maxSize,
	total,
}: {
	type: UnitType;
	label: string;
	color: string;
	count: number;
	available: number;
	onAdjust: (d: number) => void;
	maxSize: number;
	total: number;
}) {
	const canIncrease = count < available && total < maxSize;
	const canDecrease = count > 0;

	return (
		<div className="flex items-center gap-3 py-2 border-b border-rule">
			<UnitDot color={color} />
			<span className="text-sm text-bone">{label}</span>
			{isUndying(type) && (
				<span
					className="mono text-[9px] uppercase tracking-[0.16em] shrink-0"
					style={{ color }}
					title="Undying — reforms after the battle, won or lost."
				>
					Undying
				</span>
			)}
			<span className="mono text-[10px] text-muted min-w-[60px] text-right flex-1">
				{available} available
			</span>
			<div className="flex items-center gap-2">
				<Button
					size="icon"
					tone="bone"
					disabled={!canDecrease}
					onClick={() => onAdjust(-1)}
				>
					−
				</Button>
				<span className="mono text-sm text-bone min-w-[20px] text-center">
					{count}
				</span>
				<Button
					size="icon"
					tone="bone"
					disabled={!canIncrease}
					onClick={() => onAdjust(1)}
				>
					+
				</Button>
				<Button
					size="sm"
					tone="bone"
					disabled={!canIncrease}
					onClick={() => onAdjust(available - count)}
				>
					Max
				</Button>
			</div>
		</div>
	);
}
