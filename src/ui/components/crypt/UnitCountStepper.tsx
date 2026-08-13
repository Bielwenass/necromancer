import { isUndying } from "../../../game/rules/units";
import type { UnitType } from "../../../game/types";
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
				<button
					type="button"
					onClick={() => onAdjust(-1)}
					disabled={!canDecrease}
					className="!w-6 !h-6 !border !border-rule-strong !text-base flex items-center justify-center max-md:!w-9 max-md:!h-9"
					style={{
						color: canDecrease ? "var(--ink-bone)" : "var(--ink-faint)",
					}}
				>
					−
				</button>
				<span className="mono text-sm text-bone min-w-[20px] text-center">
					{count}
				</span>
				<button
					type="button"
					onClick={() => onAdjust(1)}
					disabled={!canIncrease}
					className="!w-6 !h-6 !border !border-rule-strong !text-base flex items-center justify-center max-md:!w-9 max-md:!h-9"
					style={{
						color: canIncrease ? "var(--ink-bone)" : "var(--ink-faint)",
					}}
				>
					+
				</button>
				<button
					type="button"
					onClick={() => onAdjust(available - count)}
					disabled={!canIncrease}
					className="!w-12 !h-6 !border !border-rule-strong !text-sm flex items-center justify-center max-md:!w-14 max-md:!h-9"
					style={{
						color: canIncrease ? "var(--ink-bone)" : "var(--ink-faint)",
					}}
				>
					Max
				</button>
			</div>
		</div>
	);
}
