interface HPBarProps {
	pct: number;
	w?: number;
	h?: number;
}

export function HPBar({ pct, w = 80, h = 4 }: HPBarProps) {
	const color =
		pct > 0.6
			? "var(--hp-good)"
			: pct > 0.3
				? "var(--hp-warn)"
				: "var(--hp-crit)";
	return (
		<div
			className="bg-bg-inset border border-rule relative overflow-hidden"
			style={{ width: w, height: h }}
		>
			<i
				className="block h-full"
				style={{
					width: `${Math.max(0, Math.min(100, pct * 100))}%`,
					background: color,
				}}
			/>
		</div>
	);
}
