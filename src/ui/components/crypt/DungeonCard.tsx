import { describeUnlock } from "../../../game/rules/describe";
import {
	CORPSE_DROP_CHANCE,
	dungeonEnemyCount,
	type ProjectedLoot,
} from "../../../game/rules/loot";
import { squadRemainingTicks } from "../../../game/rules/travel";
import { squadSize } from "../../../game/rules/units";
import type { DungeonDef, DungeonState, Squad } from "../../../game/types";
import { formatSeconds, formatTime } from "../../format";
import { IconBone, IconCorpse, IconSoul } from "../icons";
import { DungeonLootStat } from "./DungeonLootStat";
import { SQUAD_STATE_GLYPH, squadColor, tierDecoration } from "./squadDisplay";

/** A payout figure: whole numbers past 10, one decimal below it. */
function formatAmount(n: number): string {
	if (n >= 10 || Number.isInteger(n)) return String(Math.round(n));
	return n.toFixed(1);
}

/**
 * The tail of a payout tooltip: `" · ×1.14 clears · +30% bonus"`, listing only
 * the multipliers that actually apply. Pass `null` for `clearMult` on a payout
 * repeat clears don't scale.
 */
function bonusNote(clearMult: number | null, bonusMult: number): string {
	const parts: string[] = [];
	if (clearMult !== null && clearMult > 1.005)
		parts.push(`×${clearMult.toFixed(2)} clears`);
	if (bonusMult > 1.005)
		parts.push(`+${Math.round((bonusMult - 1) * 100)}% bonus`);
	return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
}

export function DungeonCard({
	def,
	ds,
	squads,
	travelTicks,
	loot,
	onDispatch,
}: {
	def: DungeonDef;
	ds: DungeonState;
	squads: Squad[];
	/** Travel duration after upgrades — see effectiveTravelTicks. */
	travelTicks: number;
	/** Payout after clear and yield bonuses — see projectLoot. */
	loot: ProjectedLoot;
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
	const totalUnits = activeSquad ? squadSize(activeSquad.composition) : 0;

	const remaining = activeSquad
		? squadRemainingTicks(activeSquad, travelTicks)
		: null;
	const eta = remaining === null ? null : formatTime(remaining);

	const tierDec = tierDecoration(def.tier);

	// `projectLoot` reports the clear multiplier and each yield ratio alongside
	// the figures, so the tooltip names the breakdown without re-deriving the
	// loot-table base. A locked economy projects zero, and reads as absent.
	const { clearMult, boneBonus, soulBonus, corpseBonus } = loot;
	const clearMultDisplay = clearMult.toFixed(2);
	const lt = def.lootTable;
	const soulPct = `${(loot.soulChance * 100).toFixed(0)}%`;
	const perDrop =
		loot.soulsPerDrop > 1.005 ? formatAmount(loot.soulsPerDrop) : null;

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
							SEALED — {describeUnlock(def)}
						</div>
					) : (
						<div className="mono text-muted text-sm flex flex-wrap items-center gap-x-5 gap-y-1">
							<span>{formatSeconds(travelTicks)}s travel</span>
							<DungeonLootStat
								icon={IconBone}
								value={`${formatAmount(loot.bonesMin)}–${formatAmount(loot.bonesMax)}`}
								boosted={boneBonus > 1.005}
								title={`Bones per clear — base ${lt.bonesMin}–${lt.bonesMax}${bonusNote(clearMult, boneBonus)}`}
							/>
							{/* A gated economy projects zero and simply isn't quoted. */}
							{loot.soulChance > 0 && (
								<DungeonLootStat
									icon={IconSoul}
									value={perDrop ? `${soulPct} · ${perDrop}` : soulPct}
									boosted={soulBonus > 1.005 || perDrop !== null}
									title={`Soul chance per clear — base ${(lt.soulChance * 100).toFixed(0)}%${bonusNote(null, soulBonus)}${
										perDrop ? ` · ${perDrop} souls per drop` : ""
									}`}
								/>
							)}
							{loot.corpses > 0 && (
								<DungeonLootStat
									icon={IconCorpse}
									value={`~${formatAmount(loot.corpses)}`}
									boosted={corpseBonus > 1.005}
									title={`Corpses per clear — ${dungeonEnemyCount(def)} enemies × ${(CORPSE_DROP_CHANCE * 100).toFixed(0)}% drop chance${bonusNote(null, corpseBonus)}`}
								/>
							)}
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
				<div className="shrink-0 min-w-[200px] text-right">
					{activeSquad ? (
						<div>
							<div className="flex items-center justify-end gap-2.5 mb-[7px]">
								<span className="display text-parchm tracking-wider">
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
								{SQUAD_STATE_GLYPH[activeSquad.state]}{" "}
								{activeSquad.state === "fighting"
									? "FIGHTING"
									: activeSquad.state === "traveling"
										? `TRAVELING${eta ? ` · ${eta}` : ""}`
										: `RETURNING${eta ? ` · ${eta}` : ""}`}
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
