import { useState } from "react";
import type { UnitType } from "../../../game/types";
import { Button } from "../common/Button";
import { UnitDot } from "../common/UnitDot";

export function UnitCountStepper({
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

	// A draft only survives while the field holds nothing to commit; anything
	// parseable is applied at once, so the field shows the clamped count.
	const [draft, setDraft] = useState<string | null>(null);

	const edit = (raw: string) => {
		const digits = raw.replace(/\D/g, "");
		setDraft(digits === "" ? "" : null);
		if (digits !== "") onAdjust(Number(digits) - count);
	};

	return (
		<div className="flex items-center gap-3 py-2 border-b border-rule">
			<UnitDot color={color} />
			<span className="text-sm text-bone">{label}</span>
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
				<input
					type="text"
					inputMode="numeric"
					aria-label={`${label} count`}
					value={draft ?? String(count)}
					onChange={(e) => edit(e.target.value)}
					onFocus={(e) => e.target.select()}
					onBlur={() => setDraft(null)}
					className="mono text-sm text-bone w-11 h-7 shrink-0 text-center bg-bg-inset border border-rule-strong outline-none focus:border-[color:var(--ink-bone)]"
				/>
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
