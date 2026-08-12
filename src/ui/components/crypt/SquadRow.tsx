import { squadSize } from "../../../game/rules/units";
import type { DungeonDef, Squad } from "../../../game/types";
import { formatTime } from "../../format";
import { SQUAD_STATE_GLYPH, squadColor } from "./squadDisplay";

interface SquadRowProps {
	squad: Squad;
	/** The dungeon the squad is headed to or coming back from, if any. */
	def: DungeonDef | null;
	/** Ticks left on the current leg — see squadRemainingTicks. */
	remainingTicks: number | null;
	/** Zebra striping index. */
	index: number;
	/** Units the reserves can give back to this squad — see replenishDelta. */
	refillCount: number;
	/** Whether auto-deploy would send this squad out again on arrival. */
	willRedeploy: boolean;
	onDisband: () => void;
	onRecall: () => void;
	onReplenish: () => void;
}

/** One legion in the right-hand list: avatar, name, state, and its actions. */
export function SquadRow({
	squad,
	def,
	remainingTicks,
	index,
	refillCount,
	willRedeploy,
	onDisband,
	onRecall,
	onReplenish,
}: SquadRowProps) {
	const total = squadSize(squad.composition);
	const rosterTotal = squadSize(squad.roster);
	const understrength = total < rosterTotal;
	const glyph = SQUAD_STATE_GLYPH[squad.state];
	const target = def?.name ?? "?";

	const stateColor =
		squad.state === "idle"
			? "text-dim"
			: squad.state === "returning"
				? "text-coin"
				: "text-muted";

	return (
		<div
			className={`px-4 py-3.5 border-b border-rule flex gap-3 items-center
                      ${index % 2 === 0 ? "bg-[rgba(212,184,140,0.01)]" : ""}`}
		>
			{/* Avatar */}
			<div className="w-[38px] h-[38px] rounded-full border border-rule-strong flex items-center justify-center relative shrink-0">
				<div
					className="w-3.5 h-3.5 rounded-full"
					style={{ background: squadColor(squad) }}
				/>
				{total > 0 && (
					<div
						title={
							understrength ? `${rosterTotal} at full strength` : undefined
						}
						className={`mono absolute -bottom-[5px] -right-[5px] text-[10px] bg-bg-inset border border-rule px-0.5
                        ${understrength ? "text-hp-warn" : "text-bone"}`}
					>
						×{total}
					</div>
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline justify-between mb-1.5">
					<div className="display text-sm text-bone !tracking-widest">
						{squad.name}
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						{squad.state === "idle" && refillCount > 0 && (
							<button
								type="button"
								onClick={onReplenish}
								title="Draft from the reserves back up to full strength"
								className="px-2 py-0.5 border border-rule-strong text-parchm mono text-[10px] tracking-[0.1em]"
							>
								REFILL ×{refillCount}
							</button>
						)}
						{squad.state === "idle" && (
							<button
								type="button"
								onClick={onDisband}
								className="px-2 py-0.5 border border-rule-strong text-hp-crit mono text-[10px] tracking-[0.1em]"
							>
								DISBAND
							</button>
						)}
						{/* A returning squad is already on its way home, so recalling it
						    only means "stay there" — pointless unless it would redeploy. */}
						{squad.state !== "idle" &&
							(squad.state !== "returning" || willRedeploy) && (
								<button
									type="button"
									onClick={onRecall}
									className="px-2 py-0.5 border border-rule-strong text-dim mono text-[10px] tracking-[0.1em]"
								>
									RECALL
								</button>
							)}
					</div>
				</div>

				<div className="flex items-baseline justify-between">
					<div
						className={`mono text-xs whitespace-nowrap overflow-hidden text-ellipsis ${stateColor}`}
					>
						{squad.state === "idle" ? `${glyph} Idle` : `${glyph} ${target}`}
					</div>

					{squad.state !== "idle" && (
						<div className="mono text-[11px] text-dim ml-auto">
							{remainingTicks === null ? "—" : formatTime(remainingTicks)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
