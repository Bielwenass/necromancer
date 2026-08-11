import { Icon } from "./Icon";

export function PointsCostBlock({
	skillCost,
	pts,
}: {
	skillCost: number;
	pts: number;
}) {
	const ok = pts >= skillCost;
	return (
		<div>
			<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
				Cost
			</div>
			<div className="border border-[color:var(--rule)] bg-bg-inset px-3.5">
				<div
					className={`flex items-center gap-2.5 py-2.5 font-mono text-xs ${ok ? "text-parchm" : "text-hp-crit"}`}
				>
					<Icon
						kind="triple"
						size={18}
						color={ok ? "var(--c-coin)" : "var(--hp-crit)"}
					/>
					<div className="flex-1 text-[11px] tracking-[0.1em]">
						Skill Points
					</div>
					<div className="min-w-[40px] text-right">{skillCost}</div>
					<div className="text-dim min-w-[50px]">/ {pts}</div>
					<div className="min-w-[18px] text-center text-xs">
						{ok ? "✓" : "✗"}
					</div>
				</div>
			</div>
		</div>
	);
}
