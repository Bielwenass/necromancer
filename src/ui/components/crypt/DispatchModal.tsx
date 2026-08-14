import { useState } from "react";
import { DUNGEON_DEFS } from "../../../game/data/dungeons";
import { randomSquadName } from "../../../game/data/squadNames";
import { dungeonOccupancy } from "../../../game/rules/squads";
import {
	emptyComposition,
	isUnitUnlocked,
	replenishDelta,
	squadSize,
	UNIT_TYPES,
} from "../../../game/rules/units";
import { useGameStore } from "../../../game/store";
import type { UnitType } from "../../../game/types";
import { UNIT_COLORS, UNIT_LABELS } from "../../theme";
import { Modal } from "../common/Modal";
import { EnemyPreview } from "./EnemyPreview";
import { compositionLabel } from "./squadDisplay";
import { UnitCountStepper } from "./UnitCountStepper";

interface DispatchModalProps {
	dungeonId: string;
	onClose: () => void;
}

export function DispatchModal({ dungeonId, onClose }: DispatchModalProps) {
	const def = DUNGEON_DEFS[dungeonId];
	const units = useGameStore((s) => s.units);
	const derived = useGameStore((s) => s.derived);
	const squads = useGameStore((s) => s.squads);
	const createSquad = useGameStore((s) => s.createSquad);
	const dispatchSquad = useGameStore((s) => s.dispatchSquad);
	const replenishSquad = useGameStore((s) => s.replenishSquad);

	const idleSquads = squads.filter((s) => s.state === "idle");
	// The cap counts squads that exist, so it blocks creating one and never
	// dispatching an idle one.
	const atCapacity = squads.length >= derived.maxSquads;
	// A squad may have taken the dungeon since this modal opened; the store guard
	// is the backstop.
	const held = dungeonOccupancy(squads).has(dungeonId);

	const [composition, setComposition] =
		useState<Record<UnitType, number>>(emptyComposition);
	const [squadName, setSquadName] = useState(randomSquadName);

	if (!def) return null;

	const totalUnits = squadSize(composition);
	const maxSize = derived.maxSquadSize;
	const canCreate =
		totalUnits > 0 && totalUnits <= maxSize && !atCapacity && !held;

	const adjust = (type: UnitType, delta: number) => {
		setComposition((prev) => {
			const newVal = Math.max(
				0,
				Math.min(
					units[type],
					prev[type] + delta,
					maxSize - totalUnits + prev[type],
				),
			);
			const newTotal = totalUnits - prev[type] + newVal;
			if (newTotal > maxSize) return prev;
			return { ...prev, [type]: newVal };
		});
	};

	const handleCreate = () => {
		if (!canCreate) return;
		const id = createSquad(composition, squadName);
		if (id) dispatchSquad(id, dungeonId);
		onClose();
	};

	const handleSendIdle = (squadId: string) => {
		dispatchSquad(squadId, dungeonId);
		onClose();
	};

	return (
		<Modal label={`Dispatch legion to ${def.name}`} onClose={onClose}>
			<div className="cornered w-[500px] bg-bg-panel border border-rule-strong p-7 max-h-[80vh] max-md:w-[calc(100vw-32px)] max-md:max-h-[85vh] max-md:overflow-y-auto max-md:p-5">
				{/* Header */}
				<div className="mb-5">
					<div className="mono text-[9px] text-dim tracking-[0.18em]">
						DISPATCH LEGION · TIER {def.tier}
					</div>
					<div className="display text-2xl text-bone !tracking-[0.12em] mt-[6px]">
						{def.name}
					</div>
					{held && (
						<div className="mono text-[10px] text-hp-crit tracking-[0.18em] mt-2">
							ANOTHER LEGION HOLDS THIS TOMB
						</div>
					)}
				</div>

				<EnemyPreview enemies={def.enemies} />

				{idleSquads.length > 0 && (
					<>
						<div className="h-px bg-rule mb-4" />
						<div className="mono text-[10px] text-dim tracking-widest mb-[10px]">
							IDLE LEGIONS
						</div>
						<div className="flex flex-col gap-[6px] mb-5">
							{idleSquads.map((squad) => {
								const totalSq = squadSize(squad.composition);
								const rosterSq = squadSize(squad.roster);
								const refillCount = squadSize(
									replenishDelta(squad, units, maxSize),
								);
								const compStr = compositionLabel(squad.composition);
								return (
									<div
										key={squad.id}
										className="flex items-center gap-3 px-[14px] py-[10px] border border-rule bg-bg-inset"
									>
										<div className="flex-1">
											<div className="display text-sm text-bone tracking-widest">
												{squad.name}
											</div>
											<div className="mono text-[10px] text-muted mt-0.5">
												<span
													className={
														totalSq < rosterSq ? "text-hp-warn" : undefined
													}
												>
													×{totalSq}
													{totalSq < rosterSq ? `/${rosterSq}` : ""}
												</span>{" "}
												· {compStr}
											</div>
										</div>
										{refillCount > 0 && (
											<button
												type="button"
												onClick={() => replenishSquad(squad.id)}
												title="Draft from the reserves back up to full strength"
												className="px-3 py-[6px] border border-rule-strong text-parchm cursor-pointer display text-[10px] tracking-[0.2em]"
											>
												REFILL ×{refillCount}
											</button>
										)}
										<button
											type="button"
											onClick={() => handleSendIdle(squad.id)}
											disabled={held}
											className={`px-4 py-[6px] border display text-[10px] tracking-[0.2em] ${
												held
													? "border-rule text-dim cursor-not-allowed"
													: "border-coin bg-coin/5 text-coin cursor-pointer"
											}`}
										>
											SEND ⇢
										</button>
									</div>
								);
							})}
						</div>
					</>
				)}

				<div className="h-px bg-rule mb-4" />
				<div className="mono text-[10px] text-dim tracking-widest mb-[14px]">
					FORM NEW LEGION
					{atCapacity && (
						<span className="text-hp-crit mb-4">
							&nbsp;· SQUAD LIMIT REACHED · {squads.length}/{derived.maxSquads}
						</span>
					)}
				</div>

				{/* Squad name */}
				<div className="mb-4">
					<div className="mono text-[10px] text-dim tracking-widest mb-[6px]">
						SQUAD NAME
					</div>
					<input
						value={squadName}
						onChange={(e) => setSquadName(e.target.value.trim())}
						className="w-full bg-bg-inset border border-rule-strong text-bone display text-sm !tracking-[0.12em] px-3 py-2 outline-none"
					/>
				</div>

				{/* Composition */}
				<div className="mb-5">
					<div className="flex justify-between mb-2">
						<span className="mono text-[10px] text-dim tracking-widest">
							COMPOSITION
						</span>
						<span
							className="mono text-[10px]"
							style={{
								color:
									totalUnits > maxSize ? "var(--hp-crit)" : "var(--ink-muted)",
							}}
						>
							{totalUnits}/{maxSize} UNITS
						</span>
					</div>
					{UNIT_TYPES.filter((type) => isUnitUnlocked(type, derived)).map(
						(type) => (
							<UnitCountStepper
								key={type}
								type={type}
								label={UNIT_LABELS[type]}
								color={UNIT_COLORS[type]}
								count={composition[type]}
								available={units[type]}
								onAdjust={(d) => adjust(type, d)}
								maxSize={maxSize}
								total={totalUnits}
							/>
						),
					)}
				</div>

				{/* Footer buttons */}
				<div className="flex gap-[10px]">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 py-3 border border-rule-strong display text-xs tracking-[0.22em] uppercase text-muted"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleCreate}
						disabled={!canCreate}
						className="flex-[2] py-3 border display text-xs tracking-[0.22em] uppercase"
						style={{
							borderColor: canCreate ? "var(--c-coin)" : "var(--rule)",
							color: canCreate ? "var(--c-coin)" : "var(--ink-dim)",
							background: canCreate ? "rgba(212,168,87,0.06)" : "transparent",
							cursor: canCreate ? "pointer" : "not-allowed",
						}}
					>
						Form &amp; Dispatch
					</button>
				</div>
			</div>
		</Modal>
	);
}
