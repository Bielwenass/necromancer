import type { Rarity, RelicSlotType } from "../../game/types";
import { rarityColor } from "../theme";
import { FilterChip } from "./FilterChip";
import { IconCrypt, IconSkeleton, IconWraith, IconZombie } from "./icons";

type IconComponent = (props: { size?: number; color?: string }) => JSX.Element;

const SLOT_FILTERS: {
	id: RelicSlotType;
	color: string;
	Icon: IconComponent;
}[] = [
	// The crypt has no squad color of its own; the coin gold reads as distinct
	// from --sq-skeleton, which is the same bone tone as --ink-bone.
	{ id: "crypt", color: "var(--c-coin)", Icon: IconCrypt },
	{ id: "skeleton", color: "var(--sq-skeleton)", Icon: IconSkeleton },
	{ id: "zombie", color: "var(--sq-zombie)", Icon: IconZombie },
	{ id: "wraith", color: "var(--sq-wraith)", Icon: IconWraith },
];

const RARITY_FILTERS: Rarity[] = [
	"common",
	"uncommon",
	"rare",
	"epic",
	"legendary",
];

export function InventoryFilters({
	filterSlot,
	filterRarity,
	onFilterSlot,
	onFilterRarity,
	sacrificeCount,
	sacrificeDust,
	confirming,
	onSacrifice,
	onCancelSacrifice,
}: {
	filterSlot: RelicSlotType | null;
	filterRarity: Rarity | null;
	onFilterSlot: (slot: RelicSlotType | null) => void;
	onFilterRarity: (rarity: Rarity | null) => void;
	/** How many unequipped relics the current filters match. */
	sacrificeCount: number;
	sacrificeDust: number;
	confirming: boolean;
	onSacrifice: () => void;
	onCancelSacrifice: () => void;
}) {
	const filtered = filterSlot !== null || filterRarity !== null;

	return (
		<div className="flex flex-col gap-1.5 items-end">
			<div className="flex gap-2 items-center">
				<span className="mono text-[11px] text-dim tracking-[0.14em] w-12 text-right">
					TYPE
				</span>
				{SLOT_FILTERS.map(({ id, color, Icon }) => {
					const active = filterSlot === id;
					return (
						<FilterChip
							key={id}
							label={id}
							color={color}
							active={active}
							icon={
								<Icon size={10} color={active ? color : "var(--ink-muted)"} />
							}
							onClick={() => onFilterSlot(active ? null : id)}
						/>
					);
				})}
			</div>

			<div className="flex gap-2 items-center">
				<span className="mono text-[11px] text-dim tracking-[0.14em] w-12 text-right">
					RARITY
				</span>
				{RARITY_FILTERS.map((r) => (
					<FilterChip
						key={r}
						label={r}
						color={rarityColor(r)}
						active={filterRarity === r}
						onClick={() => onFilterRarity(filterRarity === r ? null : r)}
					/>
				))}
			</div>

			{sacrificeCount > 0 && (
				<div className="flex gap-2 items-center">
					{confirming ? (
						<>
							<span className="mono text-[11px] text-hp-crit tracking-[0.12em]">
								SACRIFICE {sacrificeCount}{" "}
								{filtered ? "FILTERED" : "UNEQUIPPED"} RELIC
								{sacrificeCount === 1 ? "" : "S"}?
							</span>
							<button
								type="button"
								onClick={onCancelSacrifice}
								className="mono text-[11px] px-2 py-0.5 cursor-pointer tracking-[0.12em] uppercase border border-rule-strong text-muted"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={onSacrifice}
								className="mono text-[11px] px-2 py-0.5 cursor-pointer tracking-[0.12em] uppercase border border-hp-crit text-hp-crit bg-[rgba(196,90,62,0.08)]"
							>
								Confirm
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={onSacrifice}
							className="mono text-[11px] px-2 py-0.5 cursor-pointer tracking-[0.12em] uppercase border border-rule-strong text-parchm"
						>
							Sacrifice {filtered ? "filtered" : "all"} ({sacrificeCount}) · +
							{sacrificeDust} dust
						</button>
					)}
				</div>
			)}
		</div>
	);
}
