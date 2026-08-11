import { useEffect, useState } from "react";
import { DUNGEON_DEFS } from "../../game/data/dungeons";
import { useGameStore } from "../../game/store";
import { effectiveTravelTicks } from "../../game/travel";
import type { DungeonDef } from "../../game/types";
import { formatTime } from "../theme";
import { CombatWindow } from "./CombatWindow";
import { DispatchModal } from "./DispatchModal";
import { DungeonCard, squadColor } from "./DungeonCard";
import { IconSkeleton, IconWraith, IconZombie } from "./icons";
import type { TabId } from "./TabBar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { UnitReserve } from "./UnitReserve";

interface CryptListProps {
	onTabChange: (tab: TabId) => void;
}

export function CryptList({ onTabChange }: CryptListProps) {
	const squads = useGameStore((s) => s.squads);
	const dungeons = useGameStore((s) => s.dungeons);
	const units = useGameStore((s) => s.units);
	const derived = useGameStore((s) => s.derived);
	const resources = useGameStore((s) => s.resources);
	const summonUnits = useGameStore((s) => s.summonUnits);
	const recallSquad = useGameStore((s) => s.recallSquad);
	const deleteSquad = useGameStore((s) => s.deleteSquad);

	const [dispatchTarget, setDispatchTarget] = useState<string | null>(null);
	const [watchedSquadId, setWatchedSquadId] = useState<string | null>(null);

	useEffect(() => {
		const fightingIds = squads
			.filter((s) => s.state === "fighting")
			.map((s) => s.id);
		if (watchedSquadId !== null && !fightingIds.includes(watchedSquadId)) {
			setWatchedSquadId(fightingIds[0] ?? null);
		} else if (watchedSquadId === null && fightingIds.length > 0) {
			setWatchedSquadId(fightingIds[0]);
		}
	}, [squads, watchedSquadId]);

	return (
		<div className="necro text-base">
			<TopBar />

			<div className="stage">
				{/* ── Dungeon list ───────────────────────────────── */}
				<div className="flex-1 overflow-y-auto min-h-0">
					{(() => {
						const visible: DungeonDef[] = [];
						let foundLocked = false;
						for (const def of Object.values(DUNGEON_DEFS)) {
							const ds = dungeons.find((d) => d.id === def.id);
							if (!ds) continue;
							if (ds.unlocked) {
								visible.push(def);
							} else if (!foundLocked) {
								visible.push(def);
								foundLocked = true;
							}
						}
						return visible.map((def) => {
							const ds = dungeons.find((d) => d.id === def.id);
							if (!ds) return null;
							return (
								<DungeonCard
									key={def.id}
									def={def}
									ds={ds}
									squads={squads}
									travelTicks={effectiveTravelTicks(
										def,
										derived.squadTravelSpeedBonus,
									)}
									onDispatch={(id) => setDispatchTarget(id)}
								/>
							);
						});
					})()}
				</div>

				{/* ── Right sidebar ──────────────────────────────── */}
				<div className="w-[380px] bg-bg-panel border-l border-rule flex flex-col">
					{/* Unit reserves */}
					<div className="px-4 py-3 border-b border-rule bg-bg-panel-2">
						<div className="mono text-[11px] text-dim tracking-[0.14em] mb-2.5">
							UNIT RESERVES
						</div>
						<div className="flex flex-col gap-2">
							<UnitReserve
								type="skeleton"
								count={units.skeletons}
								icon={IconSkeleton}
								color="var(--sq-skeleton)"
								canSummon={(v) =>
									resources.bones >=
									Math.round(10 * v * (1 - derived.summonCostBonus))
								}
								onSummon={() => summonUnits("skeleton", 1)}
								cost={`${Math.round(10 * (1 - derived.summonCostBonus))} bones`}
							/>
							{derived.zombiesUnlocked && (
								<UnitReserve
									type="zombie"
									count={units.zombies}
									icon={IconZombie}
									color="var(--sq-zombie)"
									canSummon={(v) =>
										resources.bones >= 5 * v && resources.corpses >= 1 * v
									}
									onSummon={() => summonUnits("zombie", 1)}
									cost="5 bones + 1 corpse"
								/>
							)}
							{derived.wraithsUnlocked && (
								<UnitReserve
									type="wraith"
									count={units.wraiths}
									icon={IconWraith}
									color="var(--sq-wraith)"
									canSummon={(v) =>
										resources.bones >= 20 * v && resources.souls >= 1 * v
									}
									onSummon={() => summonUnits("wraith", 1)}
									cost="20 bones + 1 soul"
								/>
							)}
						</div>
					</div>

					{/* Combat window */}
					{(() => {
						if (!watchedSquadId) return null;
						const watchedSquad = squads.find(
							(s) => s.id === watchedSquadId && s.state === "fighting",
						);
						if (!watchedSquad?.targetDungeonId) return null;
						const dungeonDef = DUNGEON_DEFS[watchedSquad.targetDungeonId];
						if (!dungeonDef) return null;
						return (
							<div className="border-b border-rule bg-[#0A0A0F] shrink-0">
								<div className="flex items-center justify-between px-4 py-1.5 border-b border-rule">
									<div className="display !tracking-[0.28em] uppercase text-[11px] text-parchm">
										BATTLE · {dungeonDef.name.toUpperCase()}
									</div>
								</div>
								<CombatWindow squad={watchedSquad} def={dungeonDef} />
							</div>
						);
					})()}

					{/* Active legions */}
					<div className="flex-1 flex flex-col min-h-0">
						<div className="flex items-center justify-between py-2.5 px-3.5 border-b border-[color:var(--rule)]">
							<div className="font-display text-[11px] tracking-[0.28em] uppercase text-parchm">
								Active Legions
							</div>
							<span className="mono text-xs text-dim">
								{squads.filter((s) => s.state !== "idle").length}/
								{derived.maxActiveSquads}
							</span>
						</div>

						<div className="flex-1 overflow-y-auto">
							{squads.length === 0 && (
								<div className="p-7 text-center">
									<div className="mono text-xs text-dim">
										NO SQUADS · CLICK A DUNGEON
									</div>
								</div>
							)}

							{squads.map((squad, i) => {
								const def = squad.targetDungeonId
									? DUNGEON_DEFS[squad.targetDungeonId]
									: null;
								const total =
									squad.composition.skeleton +
									squad.composition.zombie +
									squad.composition.wraith;
								const color = squadColor(squad);
								const travelTicks = def
									? effectiveTravelTicks(def, derived.squadTravelSpeedBonus)
									: 100;
								const eta =
									squad.state === "traveling"
										? formatTime(Math.round((1 - squad.position) * travelTicks))
										: squad.state === "returning"
											? formatTime(Math.round(squad.position * travelTicks))
											: "—";

								return (
									<div
										key={squad.id}
										className={`px-4 py-3.5 border-b border-rule flex gap-3 items-center
                      ${i % 2 === 0 ? "bg-[rgba(212,184,140,0.01)]" : ""}`}
									>
										{/* Avatar */}
										<div className="w-[38px] h-[38px] rounded-full border border-rule-strong flex items-center justify-center relative shrink-0">
											<div
												className="w-3.5 h-3.5 rounded-full"
												style={{ background: color }}
											/>
											{total > 0 && (
												<div className="mono absolute -bottom-[5px] -right-[5px] text-[10px] text-bone bg-bg-inset border border-rule px-0.5">
													×{total}
												</div>
											)}
										</div>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-baseline justify-between mb-[3px]">
												<div className="display text-sm text-bone !tracking-[0.16em]">
													{squad.name}
												</div>
												{squad.state === "idle" && (
													<button
														type="button"
														onClick={() => deleteSquad(squad.id)}
														className="px-2 py-0.5 border border-rule-strong text-hp-crit mono text-[10px] tracking-[0.1em]"
													>
														DISBAND
													</button>
												)}
												{squad.state !== "idle" &&
													squad.state !== "returning" && (
														<button
															type="button"
															onClick={() => recallSquad(squad.id)}
															className="px-2 py-0.5 border border-rule-strong text-dim mono text-[10px] tracking-[0.1em]"
														>
															RECALL
														</button>
													)}
											</div>

											<div
												className={`mono text-xs mb-[5px] whitespace-nowrap overflow-hidden text-ellipsis
                        ${
													squad.state === "idle"
														? "text-dim"
														: squad.state === "returning"
															? "text-coin"
															: "text-muted"
												}`}
											>
												{squad.state === "idle"
													? "○ Idle"
													: squad.state === "returning"
														? `⇠ ${def?.name ?? "?"}`
														: squad.state === "fighting"
															? `⚔ ${def?.name ?? "?"}`
															: `⇢ ${def?.name ?? "?"}`}
											</div>

											{squad.state !== "idle" && (
												<div className="flex items-center gap-2">
													<span className="mono text-[11px] text-dim ml-auto">
														{eta}
													</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			<TabBar active="crypt" onTabChange={onTabChange} />

			{dispatchTarget && (
				<DispatchModal
					dungeonId={dispatchTarget}
					onClose={() => setDispatchTarget(null)}
				/>
			)}
		</div>
	);
}
