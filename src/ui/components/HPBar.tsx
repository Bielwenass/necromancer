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
			className="bg-bg-inset border border-rule relative overflow-hidden w-[--hpbar-w] h-[--hpbar-h]"
			style={
				{ "--hpbar-w": `${w}px`, "--hpbar-h": `${h}px` } as React.CSSProperties
			}
		>
			<i
				className="block h-full w-[--hpbar-pct]"
				style={
					{
						"--hpbar-pct": `${Math.max(0, Math.min(100, pct * 100))}%`,
						background: color,
					} as React.CSSProperties
				}
			/>
		</div>
	);
}
