import { CORPSE_DROP_CHANCE, dungeonEnemyCount } from "../../game/tick";
import type { DungeonDef, DungeonState, Squad } from "../../game/types";
import { formatSeconds, formatTime } from "../theme";

export function tierDecoration(tier: 1 | 2 | 3 | 4): {
	color: string;
	label: string;
} {
	if (tier === 4) return { color: "var(--r-epic)", label: "IV" };
	if (tier === 3) return { color: "var(--r-rare)", label: "III" };
	if (tier === 2) return { color: "var(--r-uncommon)", label: "II" };
	return { color: "var(--r-common)", label: "I" };
}

export function squadColor(squad: Squad): string {
	if (squad.composition.wraith > 0) return "var(--sq-wraith)";
	if (squad.composition.zombie > 0) return "var(--sq-zombie)";
	return "var(--sq-skeleton)";
}

export function DungeonCard({
	def,
	ds,
	squads,
	travelTicks,
	onDispatch,
}: {
	def: DungeonDef;
	ds: DungeonState;
	squads: Squad[];
	/** Travel duration after upgrades — see effectiveTravelTicks. */
	travelTicks: number;
	onDispatch: (id: string) => void;
}) {
	const fightingSquad = squads.find(
		(s) => s.targetDungeonId === def.id && s.state === "fighting",
	);
	const travelingSquad = squads.find(
		(s) => s.targetDungeonId === def.id && s.state === "traveling",
	);
	const returningSquad = squads.find(
		(s) => s.targetDungeonId === def.id && s.state === "returning",
	);
	const activeSquad = fightingSquad ?? travelingSquad ?? returningSquad;

	const locked = !ds.unlocked;
	const totalUnits = activeSquad
		? activeSquad.composition.skeleton +
			activeSquad.composition.zombie +
			activeSquad.composition.wraith
		: 0;

	const eta =
		activeSquad?.state === "traveling"
			? formatTime(Math.round((1 - activeSquad.position) * travelTicks))
			: activeSquad?.state === "returning"
				? formatTime(Math.round(activeSquad.position * travelTicks))
				: null;

	const clearMult = 1 + Math.sqrt(ds.clearCount + 1) * 0.07;
	const clearMultDisplay = clearMult.toFixed(2);
	const tierDec = tierDecoration(def.tier);

	return (
		<button
			type="button"
			onClick={() => !locked && onDispatch(def.id)}
			className={`relative block w-full text-left h-[140px] shrink-0 border-b border-rule overflow-hidden
        ${locked ? "opacity-[0.55] cursor-default" : "cursor-pointer"}`}
		>
			<div className="relative px-8 h-full flex items-center gap-7">
				{/* Tier badge — border/text color are dynamic */}
				<div
					className="shrink-0 size-[60px] px-3 py-1.5 flex flex-col items-center"
					style={{ border: `1px solid ${tierDec.color}` }}
				>
					<span
						className="mono tracking-[0.2em] text-[10px]"
						style={{ color: tierDec.color }}
					>
						TIER
					</span>
					<span className="display text-3xl" style={{ color: tierDec.color }}>
						{tierDec.label}
					</span>
				</div>

				{/* Name + stats */}
				<div className="flex-1 min-w-0">
					<div
						className={`display text-2xl mb-2 ${locked ? "text-muted" : "text-bone"}`}
					>
						{def.name}
					</div>
					{locked ? (
						<div className="mono text-dim text-sm">
							SEALED — {def.unlockCondition}
						</div>
					) : (
						<div className="mono text-muted text-sm flex flex-wrap gap-x-5">
							<span>{formatSeconds(travelTicks)}s travel</span>
							<span>
								{Math.floor(def.lootTable.bonesMin * clearMult)}–
								{Math.floor(def.lootTable.bonesMax * clearMult)} bones
							</span>
							<span>
								{Math.floor(def.lootTable.coinsMin * clearMult)}–
								{Math.floor(def.lootTable.coinsMax * clearMult)} coins
							</span>
							<span>{(def.lootTable.soulChance * 100).toFixed(0)}% soul</span>
							<span>
								~{Math.round(dungeonEnemyCount(def) * CORPSE_DROP_CHANCE)}{" "}
								corpses
							</span>
							{ds.clearCount > 0 && (
								<>
									<span className="text-coin">{ds.clearCount}× cleared</span>
									<span>x{clearMultDisplay} clear mult</span>
								</>
							)}
						</div>
					)}
				</div>

				{/* Squad status */}
				<div className="shrink-0 min-w-[260px] text-right">
					{activeSquad ? (
						<div>
							<div className="flex items-center justify-end gap-2.5 mb-[7px]">
								<span className="display text-parchm !tracking-[0.16em]">
									{activeSquad.name}
								</span>
								<span
									className="mono text-[13px]"
									style={{ color: squadColor(activeSquad) }}
								>
									×{totalUnits}
								</span>
							</div>
							<div className="mono text-[13px] text-muted">
								{activeSquad.state === "traveling" && eta
									? `⇢ TRAVELING · ${eta}`
									: activeSquad.state === "fighting"
										? "⚔ FIGHTING"
										: eta
											? `⇠ RETURNING · ${eta}`
											: "⇠ RETURNING"}
							</div>
						</div>
					) : (
						<div className="mono text-[14px] text-dim !tracking-[0.2em]">
							{locked ? "SEALED" : "AVAILABLE"}
						</div>
					)}
				</div>
			</div>
		</button>
	);
}
