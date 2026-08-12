import { useState } from "react";
import { dustValue, getRelicSlotType } from "../../game/rules/relics";
import { useGameStore } from "../../game/store";
import type { Rarity, RelicSlotType, SlotId } from "../../game/types";
import type { TabId } from "../components/chrome/TabBar";
import { EmptyState } from "../components/common/EmptyState";
import { Screen } from "../components/common/Screen";
import { SectionLabel } from "../components/common/SectionLabel";
import { EquippedSlots } from "../components/reliquary/EquippedSlots";
import { InventoryFilters } from "../components/reliquary/InventoryFilters";
import { RelicDetail } from "../components/reliquary/RelicDetail";
import { RelicInventoryCard } from "../components/reliquary/RelicInventoryCard";

interface ReliquaryProps {
	onTabChange: (tab: TabId) => void;
}

export function Reliquary({ onTabChange }: ReliquaryProps) {
	const inventory = useGameStore((s) => s.relics.inventory);
	const equipped = useGameStore((s) => s.relics.equipped);
	const derived = useGameStore((s) => s.derived);
	const equipRelic = useGameStore((s) => s.equipRelic);
	const unequipRelic = useGameStore((s) => s.unequipRelic);
	const markRelicSeen = useGameStore((s) => s.markRelicSeen);
	const sacrificeRelic = useGameStore((s) => s.sacrificeRelic);
	const sacrificeRelics = useGameStore((s) => s.sacrificeRelics);

	const [selectedRelicId, setSelectedRelicId] = useState<string | null>(null);
	const [filterRarity, setFilterRarity] = useState<Rarity | null>(null);
	const [filterSlot, setFilterSlot] = useState<RelicSlotType | null>(null);
	const [confirmSacrifice, setConfirmSacrifice] = useState(false);
	const [confirmBulkSacrifice, setConfirmBulkSacrifice] = useState(false);

	const selectedRelic =
		inventory.find((r) => r.id === selectedRelicId) ??
		(selectedRelicId
			? Object.values(equipped)
					.map((id) => inventory.find((r) => r.id === id))
					.find((r) => r?.id === selectedRelicId)
			: null);

	// Equipped relics are excluded, so the bulk sacrifice below can never eat a
	// relic that is currently doing something.
	const filteredInventory = inventory
		.filter((r) => !Object.values(equipped).includes(r.id))
		.filter((r) => !filterRarity || r.rarity === filterRarity)
		.filter((r) => !filterSlot || getRelicSlotType(r.baseId) === filterSlot);

	const filteredDust = dustValue(filteredInventory);

	// Slots only select the relic they hold — equipping is done from the
	// EQUIP TO SLOT buttons in RelicDetail, which offer only valid slots.
	const handleSlotClick = (slotId: SlotId) => {
		const equippedId = equipped[slotId];
		if (equippedId) setSelectedRelicId(equippedId);
	};

	const handleSelectRelic = (relicId: string) => {
		if (selectedRelicId === relicId) {
			setSelectedRelicId(null);
		} else {
			setSelectedRelicId(relicId);
			markRelicSeen(relicId);
		}
	};

	const handleSacrifice = () => {
		if (!selectedRelicId) return;
		sacrificeRelic(selectedRelicId);
		setSelectedRelicId(null);
		setConfirmSacrifice(false);
	};

	const handleBulkSacrifice = () => {
		if (!confirmBulkSacrifice) {
			setConfirmBulkSacrifice(true);
			return;
		}
		const doomed = filteredInventory.map((r) => r.id);
		sacrificeRelics(doomed);
		if (selectedRelicId && doomed.includes(selectedRelicId)) {
			setSelectedRelicId(null);
			setConfirmSacrifice(false);
		}
		setConfirmBulkSacrifice(false);
	};

	return (
		<Screen tab="reliquary" onTabChange={onTabChange} stageClassName="min-h-0">
			<EquippedSlots
				inventory={inventory}
				equipped={equipped}
				derived={derived}
				selectedRelicId={selectedRelicId}
				onSelectSlot={handleSlotClick}
				onUnequip={unequipRelic}
			/>

			{/* CENTER — Detail */}
			<div className="w-[380px] border-r border-rule flex flex-col overflow-hidden bg-[linear-gradient(180deg,#15110b_0%,#0f0c08_100%)]">
				{selectedRelic ? (
					<RelicDetail
						relic={selectedRelic}
						unlockedSlots={derived.unlockedSlots}
						onSacrifice={() => {
							if (confirmSacrifice) handleSacrifice();
							else setConfirmSacrifice(true);
						}}
						onEquip={(slotId) => {
							equipRelic(selectedRelic.id, slotId);
							setSelectedRelicId(null);
						}}
						confirmSacrifice={confirmSacrifice}
						onCancelSacrifice={() => setConfirmSacrifice(false)}
					/>
				) : (
					<EmptyState
						className="flex-1 flex items-center justify-center"
						textClassName="mono text-[11px] text-dim tracking-[0.14em] text-center"
					>
						SELECT A RELIC
						<br />
						TO VIEW DETAILS
					</EmptyState>
				)}
			</div>

			{/* RIGHT — Inventory */}
			<div className="flex-1 px-6 py-[22px] flex flex-col gap-5 min-w-0 overflow-hidden">
				<div className="flex items-baseline justify-between">
					<SectionLabel>Inventory</SectionLabel>
					<div className="mono text-[10px] text-muted tracking-[0.1em]">
						{filterSlot || filterRarity
							? `${filteredInventory.length} / ${inventory.length} RELICS`
							: `${inventory.length} RELICS`}
					</div>
				</div>

				<InventoryFilters
					filterSlot={filterSlot}
					filterRarity={filterRarity}
					onFilterSlot={(slot) => {
						setFilterSlot(slot);
						setConfirmBulkSacrifice(false);
					}}
					onFilterRarity={(rarity) => {
						setFilterRarity(rarity);
						setConfirmBulkSacrifice(false);
					}}
					sacrificeCount={filteredInventory.length}
					sacrificeDust={filteredDust}
					confirming={confirmBulkSacrifice}
					onSacrifice={handleBulkSacrifice}
					onCancelSacrifice={() => setConfirmBulkSacrifice(false)}
				/>

				{inventory.length === 0 ? (
					<EmptyState>NO RELICS · PERFORM RITUALS TO OBTAIN</EmptyState>
				) : filteredInventory.length === 0 ? (
					<EmptyState>NO UNEQUIPPED RELICS MATCH THIS FILTER</EmptyState>
				) : (
					<div className="scr-ghost grid grid-cols-[repeat(auto-fill,124px)] gap-2.5 content-start overflow-y-auto flex-1 p-1">
						{filteredInventory.map((relic) => (
							<RelicInventoryCard
								key={relic.id}
								relic={relic}
								selected={selectedRelicId === relic.id}
								onSelect={() => handleSelectRelic(relic.id)}
							/>
						))}
					</div>
				)}
			</div>
		</Screen>
	);
}
