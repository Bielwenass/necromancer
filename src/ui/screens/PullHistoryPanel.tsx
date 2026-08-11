import { RELIC_BASES } from "../../game/data/relics";
import { useGameStore } from "../../game/store";
import type { Rarity } from "../../game/types";
import { RelicGlyph } from "../components/RelicGlyph";
import { rarityColor } from "../theme";

function getGlyph(baseId: string): string {
	return RELIC_BASES.find((b) => b.id === baseId)?.glyph ?? "hex";
}

function getBaseName(baseId: string): string {
	return RELIC_BASES.find((b) => b.id === baseId)?.name ?? baseId;
}

export function PullHistoryPanel() {
	const pullHistory = useGameStore((s) => s.gacha.pullHistory);
	const sessionTotals = useGameStore((s) => s.gacha.sessionTotals);

	return (
		<div className="w-[260px] h-full bg-bg-panel border-r border-rule flex flex-col">
			<div className="panel-h">
				<div className="ttl">Pull History</div>
				<span className="act">LAST 50</span>
			</div>

			<div className="flex-1 overflow-y-auto">
				{pullHistory.length === 0 && (
					<div className="p-5 text-center">
						<div className="mono text-[10px] text-dim">NO PULLS YET</div>
					</div>
				)}
				{pullHistory.map((p, i) => {
					const c = rarityColor(p.rarity);
					const glyph = getGlyph(p.relicName);
					const name = getBaseName(p.relicName);
					return (
						<div
							key={`${p.relicId}-${p.tickCount}`}
							className={`flex items-center gap-[10px] px-[14px] py-[10px] border-b border-rule ${i === 0 ? "bg-[rgba(212,168,87,0.04)]" : ""}`}
						>
							<div
								className="w-[30px] h-[30px] border bg-bg-inset flex items-center justify-center shrink-0"
								style={{ borderColor: c }}
							>
								<RelicGlyph kind={glyph} size={18} color={c} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-xs text-bone whitespace-nowrap overflow-hidden text-ellipsis">
									{name}
								</div>
								<div
									className="mono text-[9px] tracking-[0.12em] uppercase mt-px"
									style={{ color: c }}
								>
									{p.rarity} · {p.poolId}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="px-[14px] py-3 border-t border-rule">
				<div className="mono text-[9px] text-dim tracking-[0.14em] mb-2">
					SESSION TOTALS ·{" "}
					{Object.values(sessionTotals).reduce((s, n) => s + n, 0)} PULLS
				</div>
				<div className="flex gap-2">
					{(
						["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]
					).map((r) => (
						<div key={r} className="flex flex-col items-center flex-1">
							<div className="mono text-xs" style={{ color: rarityColor(r) }}>
								{sessionTotals[r]}
							</div>
							<div
								className="w-full h-0.5 mt-0.5 opacity-[0.6]"
								style={{ background: rarityColor(r) }}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
