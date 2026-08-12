import type React from "react";
import { formatNumber } from "../../format";

interface PullButtonProps {
	label: string;
	cost: number;
	affordable: boolean;
	accent: string;
	Icon: React.FC<{ size?: number; color?: string }>;
	onClick: () => void;
	/** The ×10 button is wider and washed with the pool tint. */
	wide?: boolean;
	tint?: string;
	/** Corner note, e.g. the ×10's free extra pull. */
	badge?: string;
}

export function PullButton({
	label,
	cost,
	affordable,
	accent,
	Icon,
	onClick,
	wide = false,
	tint,
	badge,
}: PullButtonProps) {
	const iconColor = affordable ? accent : "var(--ink-dim)";

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!affordable}
			className={`${wide ? "flex-[1.2]" : "flex-1 bg-transparent"} py-3.5 px-0 flex flex-col items-center gap-1 relative ${
				affordable ? "cursor-pointer" : "cursor-not-allowed"
			}`}
			style={{
				border: `1px solid ${affordable ? accent : "var(--rule)"}`,
				// The wide button keeps its text bone-white and colours only the
				// label, so the two buttons don't read as the same weight.
				color: affordable
					? wide
						? "var(--ink-bone)"
						: accent
					: "var(--ink-dim)",
				...(tint
					? {
							backgroundImage: `linear-gradient(180deg, ${tint}, transparent 80%)`,
						}
					: {}),
			}}
		>
			<span
				className="font-display text-xs tracking-[0.28em]"
				style={wide ? { color: iconColor } : undefined}
			>
				{label}
			</span>
			<span className="inline-flex items-center gap-1">
				<Icon size={16} color={iconColor} />
				<span className="font-mono text-xs">{formatNumber(cost)}</span>
			</span>
			{badge && (
				<span className="font-mono absolute top-1.5 right-2 text-[8px] text-dim tracking-widest">
					{badge}
				</span>
			)}
		</button>
	);
}
