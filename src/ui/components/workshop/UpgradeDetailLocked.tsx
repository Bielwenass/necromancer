import type { WRow } from "./types";

export function UpgradeDetailLocked({ row }: { row: WRow }) {
	return (
		<div>
			<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-1.5">
				Locked
			</div>
			<div className="font-display text-2xl text-parchm tracking-widest">
				{row.name}
			</div>
			<div className="mt-3.5 p-4 border border-[color:var(--rule)] bg-bg-inset text-muted font-body italic text-sm leading-normal">
				{row.unlockText}
			</div>
		</div>
	);
}
