import { Icon } from "./Icon";
import type { WRow } from "./types";

export function UpgradeRowLocked({ row }: { row: WRow }) {
	return (
		<div className="grid grid-cols-[48px_1fr_90px_90px] items-center gap-4 px-8 py-4 border-b border-[color:var(--rule)] opacity-50 cursor-default">
			<div className="flex items-center justify-center">
				<Icon kind="forbid" size={22} color="var(--ink-dim)" />
			</div>
			<div>
				<div className="font-display text-sm tracking-[0.12em] text-muted">
					{row.name}
				</div>
				<div className="text-xs text-muted mt-[3px] leading-snug">
					{row.unlockText}
				</div>
			</div>
			<div className="text-right">
				<div className="font-mono text-[10px] tracking-[0.16em] text-dim">
					LOCKED
				</div>
			</div>
			<div />
		</div>
	);
}
