interface UnitDotProps {
	color: string;
	className?: string;
}

/** The small round colour swatch that stands in for a unit type or squad. */
export function UnitDot({ color, className = "w-2.5 h-2.5" }: UnitDotProps) {
	return (
		<div
			className={`rounded-full shrink-0 ${className}`}
			style={{ background: color }}
		/>
	);
}
