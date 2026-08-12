import type { EnemyDef } from "../../../game/types";
import { EnemyPreviewRow } from "./EnemyPreviewRow";

export function EnemyPreview({ enemies }: { enemies: EnemyDef[] }) {
	if (enemies.length === 0) return null;

	const total = enemies.reduce((sum, e) => sum + e.amount, 0);

	return (
		<div className="mb-5">
			<div className="flex justify-between mb-[6px]">
				<span className="mono text-[10px] text-dim tracking-widest">
					GARRISON
				</span>
				<span className="mono text-[10px] text-muted">×{total} HOSTILES</span>
			</div>
			<div className="border border-rule bg-bg-inset px-[14px] py-[6px]">
				{enemies.map((enemy) => (
					<EnemyPreviewRow key={enemy.name} enemy={enemy} />
				))}
			</div>
		</div>
	);
}
