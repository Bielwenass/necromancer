import { formatNumber } from "../../format";
import { Button } from "../common/Button";
import type { IconComponent } from "../icons/IconProps";

interface PullButtonProps {
	label: string;
	cost: number;
	affordable: boolean;
	accent: string;
	Icon: IconComponent;
	onClick: () => void;
	/** The ×10 button takes more of the row and a wash of the pool tint. */
	wide?: boolean;
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
	badge,
}: PullButtonProps) {
	return (
		<Button
			size="lg"
			tone={accent}
			variant={wide ? "solid" : "outline"}
			disabled={!affordable}
			onClick={onClick}
			className={`${wide ? "flex-[1.2]" : "flex-1"} relative px-0`}
		>
			<span className="flex flex-col items-center gap-1.5">
				{label}
				<span className="inline-flex items-center gap-1 font-mono text-xs tracking-normal">
					<Icon size={16} color={affordable ? accent : "var(--ink-dim)"} />
					{formatNumber(cost)}
				</span>
			</span>
			{badge && (
				<span className="font-mono absolute top-1.5 right-2 text-[8px] text-dim tracking-widest">
					{badge}
				</span>
			)}
		</Button>
	);
}
