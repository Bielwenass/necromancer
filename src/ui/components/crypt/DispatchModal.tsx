import { useState } from "react";
import { DUNGEON_DEFS } from "../../../game/data/dungeons";
import { randomSquadName } from "../../../game/data/squadNames";
import { useGameStore } from "../../../game/store";
import type { UnitType } from "../../../game/types";
import { squadSize } from "../../../game/units";
import { Modal } from "../common/Modal";
import { EnemyPreview } from "./EnemyPreview";
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

	const idleSquads = squads.filter((s) => s.state === "idle");
	// The cap is on how many squads exist at all, whatever they're doing —
	// so it only ever blocks creating a new one, never dispatching an idle one.
	const atCapacity = squads.length >= derived.maxSquads;

	const [composition, setComposition] = useState<Record<UnitType, number>>({
		skeleton: 0,
		zombie: 0,
		wraith: 0,
	});
	const [squadName, setSquadName] = useState(randomSquadName);

	if (!def) return null;

	const totalUnits = squadSize(composition);
	const maxSize = derived.maxSquadSize;
	const canCreate = totalUnits > 0 && totalUnits <= maxSize && !atCapacity;

	const adjust = (type: UnitType, delta: number) => {
		setComposition((prev) => {
			const available =
				type === "skeleton"
					? units.skeletons
					: type === "zombie"
						? units.zombies
						: units.wraiths;
			const newVal = Math.max(
				0,
				Math.min(
					available,
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
			<div className="cornered w-[500px] bg-bg-panel border border-rule-strong p-7 max-h-[80vh]">
				{/* Header */}
				<div className="mb-5">
					<div className="mono text-[9px] text-dim tracking-[0.18em]">
						DISPATCH LEGION · TIER {def.tier}
					</div>
					<div className="display text-2xl text-bone !tracking-[0.12em] mt-[6px]">
						{def.name}
					</div>
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
								const skLabel =
									squad.composition.skeleton > 0
										? `${squad.composition.skeleton}sk`
										: "";
								const zmLabel =
									squad.composition.zombie > 0
										? `${squad.composition.zombie}zm`
										: "";
								const wrLabel =
									squad.composition.wraith > 0
										? `${squad.composition.wraith}wr`
										: "";
								const compStr = [skLabel, zmLabel, wrLabel]
									.filter(Boolean)
									.join(" ");
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
												×{totalSq} · {compStr}
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleSendIdle(squad.id)}
											className="px-4 py-[6px] border border-coin bg-coin/5 text-coin cursor-pointer display text-[10px] tracking-[0.2em]"
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
					<UnitCountStepper
						type="skeleton"
						label="Skeleton"
						color="var(--sq-skeleton)"
						count={composition.skeleton}
						available={units.skeletons}
						onAdjust={(d) => adjust("skeleton", d)}
						maxSize={maxSize}
						total={totalUnits}
					/>
					{derived.zombiesUnlocked && (
						<UnitCountStepper
							type="zombie"
							label="Zombie"
							color="var(--sq-zombie)"
							count={composition.zombie}
							available={units.zombies}
							onAdjust={(d) => adjust("zombie", d)}
							maxSize={maxSize}
							total={totalUnits}
						/>
					)}
					{derived.wraithsUnlocked && (
						<UnitCountStepper
							type="wraith"
							label="Wraith"
							color="var(--sq-wraith)"
							count={composition.wraith}
							available={units.wraiths}
							onAdjust={(d) => adjust("wraith", d)}
							maxSize={maxSize}
							total={totalUnits}
						/>
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
