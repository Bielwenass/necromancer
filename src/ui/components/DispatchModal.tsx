import { useState } from "react";
import { DUNGEON_DEFS } from "../../game/data/dungeons";
import { useGameStore } from "../../game/store";
import type { UnitType } from "../../game/types";
import { EnemyPreview } from "./EnemyPreview";
import { UnitRow } from "./UnitRow";

interface DispatchModalProps {
	dungeonId: string;
	onClose: () => void;
}

const SQUAD_NAMES = [
	// compound single words
	"Coldwhisper",
	"Greymarch",
	"Boneveil",
	"Ashfall",
	"Husklight",
	"Dustwake",
	"Palebrand",
	"Mournhold",
	"Hollowfen",
	"Stillblade",
	"Quietstep",
	"Sallowgate",
	"Witherspoke",
	"Ashreach",
	"Coldspire",
	"Pyrebound",
	"Shroudbound",
	"Gravewake",
	"Tombwatch",
	"Cairnwalk",
	"Brittlebone",
	"Crackedjaw",
	"Palehand",
	"Sootmouth",
	"Ashthroat",
	"Greysong",
	"Hushblade",
	"Mutebell",
	"Marrowstone",
	"Boneglass",
	"Veilbreak",
	"Pyremarch",
	"Hollowstep",
	"Coldfall",
	"Greyfall",
	"Ashbound",
	"Husksworn",
	"Pyresworn",
	"Mournsworn",
	"Coldsworn",

	// adjective + group noun
	"Black Litany",
	"Silent Cohort",
	"Pale Vigil",
	"Sallow Watch",
	"Mute Procession",
	"Hush Brigade",
	"Sunken Order",
	"Withered Few",
	"Ashen Many",
	"Grey Throng",
	"Long Lament",
	"Late Vespers",
	"Last Watch",
	"Cold Pall",
	"Faded Banner",
	"Cracked Choir",
	"Lean Column",
	"Stiff Train",
	"Quiet Wake",
	"Slow Drift",
	"Brittle March",
	"Crooked Brigade",
	"Lank File",
	"Slender Pyre",
	"Forgotten Hand",
	"Empty Crown",
	"Wan Veil",
	"Soot Order",
	"Tallow Train",
	"Black Vespers",
	"Pale Many",
	"Grey Procession",
	"Husked Watch",
	"Sallow Few",
	"Wormridden Host",
	"Maggot Brigade",
	"Carrion Cohort",
	"Mould Many",
	"Blight Vigil",
	"Hollow Crown",

	// necro noun + group noun
	"Bone Verse",
	"Marrow Hymn",
	"Skull Watch",
	"Rib Procession",
	"Sinew Column",
	"Pyre Brigade",
	"Shroud Cohort",
	"Cairn Vigil",
	"Barrow Choir",
	"Crypt Order",
	"Tomb Tide",
	"Grave Hand",
	"Wraith Banner",
	"Husk Litany",
	"Ash Verse",
	"Soot Hymn",
	"Rot Wake",
	"Mould Procession",
	"Blight Cohort",
	"Wither Brigade",
	"Cinder Vigil",
	"Dust March",
	"Pall Tide",
	"Veil Watch",
	"Crow Choir",
	"Worm Tide",
	"Carrion Order",
	"Vulture Cohort",
	"Lich Banner",
	"Spectre Train",

	// "X of Y" form
	"Wake of Morn",
	"Vigil of Thresh",
	"Choir of Yhrun",
	"Cohort of Sael",
	"March of Hesh",
	"Veil of Karn",
	"Hand of Vyrr",
	"Watch of Caer",
	"Pall of Vorn",
	"Procession of Mournhold",
	"Throng of Coldspire",
	"Order of the Pale Crown",
	"Litany of the Long Cold",
	"Hymn of the Husked",
	"Verse of the Hollow",
	"Banner of the Sallow King",
	"Lament of Sael",
	"Tide of Vorn",
	"Brigade of Karn",
	"Column of Hesh",
	"Train of Yhrun",
	"Crown of Vael",
	"File of the Forgotten",
	"Wake of the Witnessless",
	"Choir of the Witherwood",
	"March of the Faded",
	"Order of Empty Hands",
	"Watch of the Last Pyre",
	"Cohort of Greyholm",
	"Banner of the Mute King",
	"Verse of the Long Cold",
	"Hymn of Coldspire",
	"Litany of Ash",
	"Drift of Karn",
	"Pall of Hesh",

	// numbered (matching Marrow-Eight style + Roman / ordinal variants)
	"Husk-Three",
	"Bone-Twelve",
	"Pale-Nine",
	"Ash-Fourteen",
	"Dust-Seven",
	"Rot-Six",
	"Cinder-Eleven",
	"Wither-Five",
	"Pyre-Two",
	"Shroud-Ten",
	"Cohort XIII",
	"Legion Zero",
	"Choir VI",
	"Watch IX",
	"Vigil VII",
	"Brigade XXII",
	"Column IV",
	"Order III",
	"The Seventh Hush",
	"The Ninth Pall",
	"The Fourth Wake",
	"Twelfth Husk",
	"Eighteenth Veil",
	"Nineteen Marrow",
	"Twenty-Second Pyre",

	// "The [thing]"
	"The Long Cold",
	"The Last Breath",
	"The Quiet Many",
	"The Slow March",
	"The Hollow Few",
	"The Witnessless",
	"The Late Vespers",
	"The Faded Banner",
	"The Pale Crown",
	"The Brittle Hand",
	"The Mute Choir",
	"The Stilled",
	"The Withering",
	"The Husked",
	"The Wakeless",
	"The Sleepless March",
	"The Patient",
	"The Unreturning",
	"The Unburied",
	"The Unwept",
	"The Unblinking",
	"The Lank Many",
	"The Sallow Court",
	"The Cold Procession",
	"The Grey Watch",
	"The Pale Train",
];

export function DispatchModal({ dungeonId, onClose }: DispatchModalProps) {
	const def = DUNGEON_DEFS[dungeonId];
	const units = useGameStore((s) => s.units);
	const derived = useGameStore((s) => s.derived);
	const squads = useGameStore((s) => s.squads);
	const createSquad = useGameStore((s) => s.createSquad);
	const dispatchSquad = useGameStore((s) => s.dispatchSquad);

	const idleSquads = squads.filter((s) => s.state === "idle");
	const activeCount = squads.filter((s) => s.state !== "idle").length;
	const atCapacity = activeCount >= derived.maxActiveSquads;

	const [composition, setComposition] = useState<Record<UnitType, number>>({
		skeleton: 0,
		zombie: 0,
		wraith: 0,
	});
	const [squadName, setSquadName] = useState(
		() => SQUAD_NAMES[Math.floor(Math.random() * SQUAD_NAMES.length)],
	);

	if (!def) return null;

	const totalUnits =
		composition.skeleton + composition.zombie + composition.wraith;
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
		if (atCapacity) return;
		dispatchSquad(squadId, dungeonId);
		onClose();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Dispatch legion to ${def.name}`}
			tabIndex={-1}
			className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-[100]"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
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

				{atCapacity && (
					<div className="mono text-[10px] text-hp-crit mb-4 tracking-[0.1em]">
						SQUAD LIMIT REACHED · {activeCount}/{derived.maxActiveSquads} ACTIVE
					</div>
				)}

				{idleSquads.length > 0 && (
					<>
						<div className="h-px bg-rule mb-4" />
						<div className="mono text-[9px] text-dim tracking-[0.16em] mb-[10px]">
							IDLE LEGIONS
						</div>
						<div className="flex flex-col gap-[6px] mb-5">
							{idleSquads.map((squad) => {
								const totalSq =
									squad.composition.skeleton +
									squad.composition.zombie +
									squad.composition.wraith;
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
											<div className="display text-sm text-bone !tracking-[0.14em]">
												{squad.name}
											</div>
											<div className="mono text-[10px] text-muted mt-0.5">
												×{totalSq} · {compStr}
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleSendIdle(squad.id)}
											disabled={atCapacity}
											className="px-4 py-[6px] border display text-[10px] tracking-[0.2em]"
											style={{
												borderColor: atCapacity
													? "var(--rule)"
													: "var(--c-coin)",
												color: atCapacity ? "var(--ink-dim)" : "var(--c-coin)",
												background: atCapacity
													? "transparent"
													: "rgba(212,168,87,0.05)",
												cursor: atCapacity ? "not-allowed" : "pointer",
											}}
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
				<div className="mono text-[9px] text-dim tracking-[0.16em] mb-[14px]">
					FORM NEW LEGION
				</div>

				{/* Squad name */}
				<div className="mb-4">
					<div className="mono text-[9px] text-dim tracking-[0.14em] mb-[6px]">
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
						<span className="mono text-[9px] text-dim tracking-[0.14em]">
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
					<UnitRow
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
						<UnitRow
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
						<UnitRow
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
		</div>
	);
}
