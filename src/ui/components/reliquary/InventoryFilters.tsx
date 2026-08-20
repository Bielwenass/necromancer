import { RARITY_ORDER } from "../../../game/data/relics";
import { UNIT_COLORS } from "../../../game/data/units";
import type { Rarity, RelicSlotType } from "../../../game/types";
import { rarityColor } from "../../theme";
import { Button } from "../common/Button";
import { ConfirmAction } from "../common/ConfirmAction";
import { IconCrypt, IconSkeleton, IconWraith, IconZombie } from "../icons";
import type { IconComponent } from "../icons/IconProps";

const SLOT_FILTERS: {
	id: RelicSlotType;
	color: string;
	Icon: IconComponent;
}[] = [
	// The crypt has no squad color; coin gold reads distinct from
	// UNIT_COLORS.skeleton, which shares the bone tone of --ink-bone.
	{ id: "crypt", color: "var(--c-coin)", Icon: IconCrypt },
	{ id: "skeleton", color: UNIT_COLORS.skeleton, Icon: IconSkeleton },
	{ id: "zombie", color: UNIT_COLORS.zombie, Icon: IconZombie },
	{ id: "wraith", color: UNIT_COLORS.wraith, Icon: IconWraith },
];

const RARITY_FILTERS: readonly Rarity[] = RARITY_ORDER;

export function InventoryFilters({
	filterSlot,
	filterRarity,
	onFilterSlot,
	onFilterRarity,
	sacrificeCount,
	sacrificeDust,
	confirming,
	onRequestSacrifice,
	onConfirmSacrifice,
	onCancelSacrifice,
}: {
	filterSlot: RelicSlotType | null;
	filterRarity: Rarity | null;
	onFilterSlot: (slot: RelicSlotType | null) => void;
	onFilterRarity: (rarity: Rarity | null) => void;
	sacrificeCount: number;
	sacrificeDust: number;
	confirming: boolean;
	onRequestSacrifice: () => void;
	onConfirmSacrifice: () => void;
	onCancelSacrifice: () => void;
}) {
	const filtered = filterSlot !== null || filterRarity !== null;

	return (
		<div className="flex flex-col gap-1.5 items-end max-md:items-start">
			<div className="flex gap-2 items-center max-md:flex-wrap">
				<span className="mono text-[11px] text-dim tracking-[0.14em] w-12 text-right">
					TYPE
				</span>
				{SLOT_FILTERS.map(({ id, color, Icon }) => {
					const active = filterSlot === id;
					return (
						<Button
							key={id}
							size="xs"
							tone={color}
							selected={active}
							onClick={() => onFilterSlot(active ? null : id)}
						>
							<Icon size={10} color={active ? color : "var(--ink-muted)"} />
							{id}
						</Button>
					);
				})}
			</div>

			<div className="flex gap-2 items-center max-md:flex-wrap">
				<span className="mono text-[11px] text-dim tracking-[0.14em] w-12 text-right">
					RARITY
				</span>
				{RARITY_FILTERS.map((r) => (
					<Button
						key={r}
						size="xs"
						tone={rarityColor(r)}
						selected={filterRarity === r}
						onClick={() => onFilterRarity(filterRarity === r ? null : r)}
					>
						{r}
					</Button>
				))}
			</div>

			{sacrificeCount > 0 && (
				<div className="flex gap-2 items-center">
					<ConfirmAction
						confirming={confirming}
						onRequest={onRequestSacrifice}
						onConfirm={onConfirmSacrifice}
						onCancel={onCancelSacrifice}
						label={
							<>
								Sacrifice {filtered ? "filtered" : "all"} ({sacrificeCount}) · +
								{sacrificeDust} dust
							</>
						}
						message={
							<span className="mono text-[11px] text-hp-crit tracking-[0.12em]">
								SACRIFICE {sacrificeCount}{" "}
								{filtered ? "FILTERED" : "UNEQUIPPED"} RELIC
								{sacrificeCount === 1 ? "" : "S"}?
							</span>
						}
						size="xs"
					/>
				</div>
			)}
		</div>
	);
}
