interface MeterProps {
	/** Fill fraction, 0–1. Clamped, so callers may hand over raw ratios. */
	value: number;
	color: string;
	className?: string;
	/**
	 * Track border, defaulting to Tailwind's `border-rule`. The two `--rule`
	 * spellings do not render alike (see CLAUDE.md), so a call site wanting the
	 * CSS variable passes it explicitly.
	 */
	borderClassName?: string;
}

/** An inset track with a coloured fill: pity, quality, and unit health. */
export function Meter({
	value,
	color,
	className = "h-[5px]",
	borderClassName = "border-rule",
}: MeterProps) {
	const pct = Math.max(0, Math.min(1, value)) * 100;
	return (
		<div
			className={`bg-bg-inset border relative overflow-hidden ${borderClassName} ${className}`}
		>
			<i
				className="block h-full"
				style={{ width: `${pct}%`, background: color }}
			/>
		</div>
	);
}
