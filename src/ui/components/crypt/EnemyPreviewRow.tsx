import type { EnemyDef } from "../../../game/types";

function prettyName(name: string): string {
	return name
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

export function EnemyPreviewRow({ enemy }: { enemy: EnemyDef }) {
	return (
		<div className="flex items-center gap-[10px] py-[5px] border-b border-rule last:border-b-0">
			<div
				className="w-2.5 h-2.5 rounded-full shrink-0"
				style={{ background: enemy.color }}
			/>
			<span className="flex-1 text-sm text-bone truncate">
				{prettyName(enemy.name)}
			</span>
			<span className="mono text-[10px] text-parchm min-w-[46px] text-right">
				×{enemy.amount}
			</span>
			<span className="mono text-[10px] text-hp-good min-w-[52px] text-right">
				{enemy.stats.hp} HP
			</span>
			<span className="mono text-[10px] text-hp-crit min-w-[52px] text-right">
				{enemy.stats.dmg} DMG
			</span>
		</div>
	);
}
