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
	onDisband: () => void;
	onRecall: () => void;
}

/** One legion in the right-hand list: avatar, name, state, and its action. */
export function SquadRow({
	squad,
	def,
	remainingTicks,
	index,
	onDisband,
	onRecall,
}: SquadRowProps) {
	const total = squadSize(squad.composition);
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
					<div className="mono absolute -bottom-[5px] -right-[5px] text-[10px] text-bone bg-bg-inset border border-rule px-0.5">
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
					{squad.state === "idle" && (
						<button
							type="button"
							onClick={onDisband}
							className="px-2 py-0.5 border border-rule-strong text-hp-crit mono text-[10px] tracking-[0.1em]"
						>
							DISBAND
						</button>
					)}
					{squad.state !== "idle" && squad.state !== "returning" && (
						<button
							type="button"
							onClick={onRecall}
							className="px-2 py-0.5 border border-rule-strong text-dim mono text-[10px] tracking-[0.1em]"
						>
							RECALL
						</button>
					)}
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
