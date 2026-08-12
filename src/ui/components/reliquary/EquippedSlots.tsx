import type { GameState, Relic, SlotId } from "../../../game/types";
import { UNIT_COLORS } from "../../theme";
import { SectionLabel } from "../common/SectionLabel";
import { UnitDot } from "../common/UnitDot";
import { IconCrypt } from "../icons";
import { RelicSlotCard } from "./RelicSlotCard";
import { SLOT_GROUPS } from "./slotGroups";
import { UnitStatBlock } from "./UnitStatBlock";

interface EquippedSlotsProps {
	inventory: Relic[];
	equipped: Partial<Record<SlotId, string | null>>;
	derived: GameState["derived"];
	selectedRelicId: string | null;
	onSelectSlot: (slotId: SlotId) => void;
	onUnequip: (slotId: SlotId) => void;
}

/** The left column: every relic slot, grouped by crypt and summoning circle. */
export function EquippedSlots({
	inventory,
	equipped,
	derived,
	selectedRelicId,
	onSelectSlot,
	onUnequip,
}: EquippedSlotsProps) {
	const visibleGroups = SLOT_GROUPS.filter((group) => {
		if (group.unitType === "zombie") return derived.zombiesUnlocked;
		if (group.unitType === "wraith") return derived.wraithsUnlocked;
		return true;
	});

	return (
		<div className="scr-ghost w-[560px] py-[22px] px-6 border-r border-rule flex flex-col gap-[18px] overflow-y-auto">
			<SectionLabel>Equipped</SectionLabel>

			{visibleGroups.map((group) => (
				<div key={group.title}>
					{/* Group header */}
					<div className="flex items-center gap-2 mb-2">
						{group.unitType ? (
							<UnitDot color={UNIT_COLORS[group.unitType]} />
						) : (
							<IconCrypt size={12} color="var(--ink-muted)" />
						)}
						<span className="display text-bone tracking-widest">
							{group.title}
						</span>
						<div className="flex-1 h-px bg-rule ml-1.5" />
					</div>

					{group.unitType && (
						<UnitStatBlock unitType={group.unitType} derived={derived} />
					)}

					{/* Slot cards */}
					<div className="flex gap-2.5">
						{group.slots.map((slot) => {
							const relicId = equipped[slot.id];
							const relic = relicId
								? inventory.find((r) => r.id === relicId)
								: null;
							return (
								<RelicSlotCard
									key={slot.id}
									slotLabel={slot.label}
									relic={relic ?? null}
									locked={!derived.unlockedSlots.includes(slot.id)}
									selected={selectedRelicId === relicId && !!relicId}
									onSelect={() => onSelectSlot(slot.id)}
									onUnequip={() => onUnequip(slot.id)}
								/>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
