import { useState } from "react";
import { useGameStore } from "../../game/store";
import type { Rarity, SlotId } from "../../game/types";
import { EquippedSlotCard } from "../components/EquippedSlotCard";
import { InvCard } from "../components/InvCard";
import { IconCrypt } from "../components/icons";
import { RelicDetail } from "../components/RelicDetail";
import type { TabId } from "../components/TabBar";
import { TabBar } from "../components/TabBar";
import { TopBar } from "../components/TopBar";
import { rarityColor } from "../theme";

const SLOT_GROUPS: {
	title: string;
	slots: { id: SlotId; label: string }[];
	unitType?: "skeleton" | "zombie" | "wraith";
}[] = [
	{
		title: "The Crypt",
		slots: [
			{ id: "C1", label: "C-I" },
			{ id: "C2", label: "C-II" },
			{ id: "C3", label: "C-III" },
		],
	},
	{
		title: "Skeleton Summoning Circle",
		unitType: "skeleton",
		slots: [
			{ id: "I1", label: "I-α" },
			{ id: "I2", label: "I-β" },
		],
	},
	{
		title: "Zombie Summoning Circle",
		unitType: "zombie",
		slots: [
			{ id: "II1", label: "II-α" },
			{ id: "II2", label: "II-β" },
		],
	},
	{
		title: "Wraith Summoning Circle",
		unitType: "wraith",
		slots: [
			{ id: "III1", label: "III-α" },
			{ id: "III2", label: "III-β" },
		],
	},
];

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

	const [selectedRelicId, setSelectedRelicId] = useState<string | null>(null);
	const [filterRarity, setFilterRarity] = useState<Rarity | null>(null);
	const [confirmSacrifice, setConfirmSacrifice] = useState(false);

	const selectedRelic =
		inventory.find((r) => r.id === selectedRelicId) ??
		(selectedRelicId
			? Object.values(equipped)
					.map((id) => inventory.find((r) => r.id === id))
					.find((r) => r?.id === selectedRelicId)
			: null);

	const filteredInventory = filterRarity
		? inventory.filter((r) => r.rarity === filterRarity)
		: inventory;

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

	return (
		<div className="necro">
			<TopBar />

			{/* ── 3-column body ─────────────────────────────── */}
			<div className="stage min-h-0">
				{/* LEFT — Equipped */}
				<div className="scr-ghost w-[560px] py-[22px] px-6 border-r border-rule flex flex-col gap-[18px] overflow-y-auto">
					<div className="display text-[13px] text-parchm !tracking-[0.28em] uppercase">
						Equipped
					</div>

					{SLOT_GROUPS.map((group) => {
						if (group.unitType === "zombie" && !derived.zombiesUnlocked)
							return null;
						if (group.unitType === "wraith" && !derived.wraithsUnlocked)
							return null;

						const dotColor =
							group.unitType === "skeleton"
								? "var(--sq-skeleton)"
								: group.unitType === "zombie"
									? "var(--sq-zombie)"
									: group.unitType === "wraith"
										? "var(--sq-wraith)"
										: null;

						return (
							<div key={group.title}>
								{/* Group header */}
								<div className="flex items-center gap-2 mb-2">
									{dotColor ? (
										<div
											className="w-2.5 h-2.5 rounded-full shrink-0"
											style={{ background: dotColor }}
										/>
									) : (
										<IconCrypt size={12} color="var(--ink-muted)" />
									)}
									<span className="display text-bone tracking-widest">
										{group.title}
									</span>
									<div className="flex-1 h-px bg-rule ml-1.5" />
								</div>

								{/* Derived stats */}
								{(() => {
									const ut = group.unitType;
									if (!ut) return null;
									return (
										<div className="flex flex-col mono text-sm mb-4">
											<div>
												HP:{" "}
												{`${Math.floor(derived[ut].hpFlat)} (+${Math.floor(derived[ut].hpFlat * derived[ut].hpBonus)})`}
											</div>
											<div>
												Damage:{" "}
												{`${Math.floor(derived[ut].dmgFlat)} (+${Math.floor(derived[ut].dmgFlat * derived[ut].dmgBonus)})`}
											</div>
											<div>
												Speed:{" "}
												{`${Math.floor(derived[ut].speedFlat * 100) / 100} (+${Math.floor(derived[ut].speedFlat * derived[ut].speedBonus * 100) / 100})`}
											</div>
										</div>
									);
								})()}

								{/* Slot cards */}
								<div className="flex gap-2.5">
									{group.slots.map((slot) => {
										const relicId = equipped[slot.id];
										const relic = relicId
											? inventory.find((r) => r.id === relicId)
											: null;
										return (
											<EquippedSlotCard
												key={slot.id}
												slotId={slot.id}
												slotLabel={slot.label}
												relic={relic ?? null}
												selected={selectedRelicId === relicId && !!relicId}
												onSelect={() => handleSlotClick(slot.id)}
												onUnequip={() => unequipRelic(slot.id)}
											/>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>

				{/* CENTER — Detail */}
				<div className="w-[380px] border-r border-rule flex flex-col overflow-hidden bg-[linear-gradient(180deg,#15110b_0%,#0f0c08_100%)]">
					{selectedRelic ? (
						<RelicDetail
							relic={selectedRelic}
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
						<div className="flex-1 flex items-center justify-center">
							<div className="mono text-[11px] text-dim tracking-[0.14em] text-center">
								SELECT A RELIC
								<br />
								TO VIEW DETAILS
							</div>
						</div>
					)}
				</div>

				{/* RIGHT — Inventory */}
				<div className="flex-1 px-6 py-[22px] flex flex-col gap-5 min-w-0 overflow-hidden">
					<div className="flex items-baseline justify-between">
						<div className="display text-[13px] text-parchm !tracking-[0.28em] uppercase">
							Inventory
						</div>
						<div className="mono text-[10px] text-muted tracking-[0.1em]">
							{inventory.length} RELICS
						</div>
					</div>

					<div className="ml-auto flex gap-2 items-center">
						<span className="mono text-[9px] text-dim tracking-[0.14em]">
							FILTER
						</span>
						{(
							["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]
						).map((r) => (
							<button
								type="button"
								key={r}
								onClick={() => setFilterRarity(filterRarity === r ? null : r)}
								className="mono text-[9px] px-2 py-0.5 cursor-pointer tracking-[0.12em] uppercase border"
								style={{
									borderColor:
										filterRarity === r ? rarityColor(r) : "var(--rule)",
									color:
										filterRarity === r ? rarityColor(r) : "var(--ink-muted)",
								}}
							>
								{r}
							</button>
						))}
					</div>

					{inventory.length === 0 ? (
						<div className="p-6 text-center">
							<div className="mono text-[10px] text-dim tracking-[0.14em]">
								NO RELICS · PERFORM RITUALS TO OBTAIN
							</div>
						</div>
					) : (
						<div className="scr-ghost grid grid-cols-[repeat(auto-fill,124px)] gap-2.5 content-start overflow-y-auto flex-1 p-1">
							{filteredInventory.map((relic) => (
								<InvCard
									key={relic.id}
									relic={relic}
									selected={selectedRelicId === relic.id}
									onSelect={() => handleSelectRelic(relic.id)}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			<TabBar active="reliquary" onTabChange={onTabChange} />
		</div>
	);
}
