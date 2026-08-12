import { useEffect, useState } from "react";
import { DUNGEON_DEFS } from "../../game/data/dungeons";
import { useGameStore } from "../../game/store";
import { projectLoot } from "../../game/tick";
import { effectiveTravelTicks, squadRemainingTicks } from "../../game/travel";
import type { DungeonDef } from "../../game/types";
import type { TabId } from "../components/chrome/TabBar";
import { EmptyState } from "../components/common/EmptyState";
import { Screen } from "../components/common/Screen";
import { SectionLabel } from "../components/common/SectionLabel";
import { CombatWindow } from "../components/crypt/CombatWindow";
import { DispatchModal } from "../components/crypt/DispatchModal";
import { DungeonCard } from "../components/crypt/DungeonCard";
import { SquadRow } from "../components/crypt/SquadRow";
import { UnitReserves } from "../components/crypt/UnitReserves";

interface CryptProps {
	onTabChange: (tab: TabId) => void;
}

export function Crypt({ onTabChange }: CryptProps) {
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

	// Every unlocked dungeon, plus the first locked one as a teaser for what
	// comes next.
	const visibleDungeons: DungeonDef[] = [];
	let foundLocked = false;
	for (const def of Object.values(DUNGEON_DEFS)) {
		const ds = dungeons.find((d) => d.id === def.id);
		if (!ds) continue;
		if (ds.unlocked) {
			visibleDungeons.push(def);
		} else if (!foundLocked) {
			visibleDungeons.push(def);
			foundLocked = true;
		}
	}

	const watchedSquad = watchedSquadId
		? squads.find((s) => s.id === watchedSquadId && s.state === "fighting")
		: undefined;
	const watchedDungeon = watchedSquad?.targetDungeonId
		? (DUNGEON_DEFS[watchedSquad.targetDungeonId] ?? null)
		: null;

	return (
		<Screen
			tab="crypt"
			onTabChange={onTabChange}
			className="text-base"
			overlay={
				dispatchTarget && (
					<DispatchModal
						dungeonId={dispatchTarget}
						onClose={() => setDispatchTarget(null)}
					/>
				)
			}
		>
			{/* ── Dungeon list ───────────────────────────────── */}
			<div className="flex-1 overflow-y-auto min-h-0">
				{visibleDungeons.map((def) => {
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
							loot={projectLoot(def, ds.clearCount, derived)}
							onDispatch={(id) => setDispatchTarget(id)}
						/>
					);
				})}
			</div>

			{/* ── Right sidebar ──────────────────────────────── */}
			<div className="w-[380px] bg-bg-panel border-l border-rule flex flex-col">
				<UnitReserves
					units={units}
					squads={squads}
					derived={derived}
					resources={resources}
					onSummon={summonUnits}
				/>

				{watchedSquad && watchedDungeon && (
					<div className="border-b border-rule bg-[#0A0A0F] shrink-0">
						<div className="flex items-center justify-between px-4 py-1.5 border-b border-rule">
							<SectionLabel className="text-[11px] text-parchm tracking-[0.28em]">
								BATTLE · {watchedDungeon.name.toUpperCase()}
							</SectionLabel>
						</div>
						<CombatWindow squad={watchedSquad} def={watchedDungeon} />
					</div>
				)}

				{/* Legions */}
				<div className="flex-1 flex flex-col min-h-0">
					<div className="flex items-center justify-between py-2.5 px-3.5 border-b border-[color:var(--rule)]">
						<SectionLabel className="text-[11px] text-parchm tracking-[0.28em]">
							Legions
						</SectionLabel>
						<span className="mono text-xs text-dim">
							{squads.length}/{derived.maxSquads}
						</span>
					</div>

					<div className="flex-1 overflow-y-auto">
						{squads.length === 0 && (
							<EmptyState
								className="p-7 text-center"
								textClassName="mono text-xs text-dim"
							>
								NO SQUADS · CLICK A DUNGEON
							</EmptyState>
						)}

						{squads.map((squad, i) => {
							const def = squad.targetDungeonId
								? (DUNGEON_DEFS[squad.targetDungeonId] ?? null)
								: null;
							const travelTicks = def
								? effectiveTravelTicks(def, derived.squadTravelSpeedBonus)
								: 100;
							return (
								<SquadRow
									key={squad.id}
									squad={squad}
									def={def}
									remainingTicks={squadRemainingTicks(squad, travelTicks)}
									index={i}
									onDisband={() => deleteSquad(squad.id)}
									onRecall={() => recallSquad(squad.id)}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</Screen>
	);
}
