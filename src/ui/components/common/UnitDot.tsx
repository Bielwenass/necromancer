interface UnitDotProps {
	color: string;
	className?: string;
}

export function UnitDot({ color, className = "w-2.5 h-2.5" }: UnitDotProps) {
	return (
		<div
			className={`rounded-full shrink-0 ${className}`}
			style={{ background: color }}
		/>
	);
}
