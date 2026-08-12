import { UPGRADE_NODES } from "./data/upgrades";
import { canAffordCost } from "./resources";
import type { GameState, Resources, UpgradeNode } from "./types";
import { gardenTotalYield, UNIT_STAT_CONFIG } from "./workshopUpgrades";

/**
 * An upgrade node's price, in the same `Partial<Resources>` shape every other
 * purchase in the game uses. Nodes are banner-only today; keeping the cost a
 * resource map means a node could charge souls or bones without a new code path.
 */
export function upgradeCost(node: UpgradeNode): Partial<Resources> {
	return { banners: node.cost };
}

export function recomputeDerived(state: GameState): GameState["derived"] {
	const purchased = state.upgrades.purchased;
	const equipped = state.relics.equipped;
	const inventory = state.relics.inventory;

	// Start with base values
	let bonesPassiveMult = 1;
	const coinsPerTick = 0;
	const soulsPerTick = 0;
	let boneYieldBonus = 0;
	let coinYieldBonus = 0;
	let soulsYieldBonus = 0;
	let corpseYieldBonus = 0;

	let maxSquadSize = 5;
	let maxSquads = 1;
	let zombiesUnlocked = false;
	let wraithsUnlocked = false;
	let autoDeploy = false;
	let boneSurgeActive = false;
	let soulHarvestBonus = 0;
	let rarityBoostActive = false;

	let skeletonDamageBonus = 0;
	let skeletonDamageFlat = 0;
	let skeletonHpBonus = 0;
	let skeletonHpFlat = 0;
	let skeletonSpeedBonus = 0;
	let skeletonSpeedFlat = 0;

	let zombieDamageBonus = 0;
	let zombieDamageFlat = 0;
	let zombieHpBonus = 0;
	let zombieHpFlat = 0;
	const zombieSpeedBonus = 0;
	let zombieSpeedFlat = 0;

	let wraithDamageBonus = 0;
	let wraithDamageFlat = 0;
	let wraithHpBonus = 0;
	let wraithHpFlat = 0;
	let wraithSpeedBonus = 0;
	let wraithSpeedFlat = 0;

	let squadTravelSpeedBonus = 0;
	let summonCostBonus = 0;
	let gardenBonesPerTick = 0;

	// Apply upgrade effects
	for (const nodeId of purchased) {
		switch (nodeId) {
			case "s0":
				maxSquadSize += 2;
				break;
			case "s1a":
				summonCostBonus += 0.2;
				break; // Faster Summon: -20% summon cost
			case "s1b":
				skeletonDamageBonus += 0.15;
				skeletonHpBonus += 0.1;
				break;
			case "s2":
				zombiesUnlocked = true;
				break;
			case "s3a":
				maxSquads += 1;
				break;
			case "s3b":
				skeletonDamageBonus += 0.2;
				break;
			case "s4a":
				maxSquadSize += 2;
				break;
			case "s4b":
				wraithsUnlocked = true;
				break;
			case "s5a":
				maxSquads += 1;
				break;
			case "s5b":
				break; // Reanimation — handled in tick
			case "s6":
				maxSquads += 1;
				maxSquadSize += 10;
				break;
			case "s7":
				skeletonDamageBonus += 0.25;
				skeletonHpBonus += 0.25;
				zombieDamageBonus += 0.25;
				zombieHpBonus += 0.25;
				wraithDamageBonus += 0.25;
				wraithHpBonus += 0.25;
				bonesPassiveMult *= 2;
				break;
			case "c0":
				autoDeploy = true;
				break;
			case "c1a":
				skeletonDamageBonus += 0.1;
				zombieDamageBonus += 0.1;
				wraithDamageBonus += 0.1;
				break;
			case "c1b":
				skeletonDamageBonus += 0.2;
				zombieDamageBonus += 0.2;
				wraithDamageBonus += 0.2;
				skeletonHpBonus -= 0.1;
				zombieHpBonus -= 0.1;
				wraithHpBonus -= 0.1;
				break;
			case "c2":
				skeletonHpBonus += 0.2;
				zombieHpBonus += 0.2;
				wraithHpBonus += 0.2;
				skeletonDamageBonus -= 0.1;
				zombieDamageBonus -= 0.1;
				wraithDamageBonus -= 0.1;
				break;
			case "c3a":
				break; // healing on arrival
			case "c3b":
				break; // group tactics — in combat
			case "c4a":
				squadTravelSpeedBonus += 0.3;
				break;
			case "c4b":
				break; // vampiric — in combat
			case "c5a":
				maxSquads += 1;
				break;
			case "c5b":
				break; // battle drums — in combat
			case "c6":
				maxSquads += 1;
				skeletonDamageBonus += 0.1;
				zombieDamageBonus += 0.1;
				wraithDamageBonus += 0.1;
				skeletonHpBonus += 0.1;
				zombieHpBonus += 0.1;
				wraithHpBonus += 0.1;
				break;
			case "c7":
				skeletonDamageBonus += 0.25;
				zombieDamageBonus += 0.25;
				wraithDamageBonus += 0.25;
				break;
			case "n0":
				soulHarvestBonus += 0.5;
				break;
			case "n1a":
				boneSurgeActive = true;
				bonesPassiveMult *= 1.5;
				break;
			case "n1b":
				zombieDamageBonus += 0.15;
				break;
			case "n2":
				break; // death aura — in combat
			case "n3a":
				corpseYieldBonus += 0.2;
				break;
			case "n3b":
				soulHarvestBonus += 0.3;
				break; // approximates "+1% soul chance per tier" as a flat multiplier
			case "n4a":
				break; // phylactery — free pulls
			case "n4b":
				break; // lich form — revive on death, in combat
			case "n5a":
				bonesPassiveMult *= 1.25;
				boneYieldBonus += 0.3;
				break;
			case "n5b":
				rarityBoostActive = true;
				break;
			case "n6":
				boneYieldBonus += 0.1;
				bonesPassiveMult *= 1.05;
				break;
			case "n7":
				bonesPassiveMult *= 2;
				break;
		}
	}

	// Apply workshop unit stat bonuses (convert flat values to % of base stat)
	if (state.workshop) {
		const ws = state.workshop;
		const usc = UNIT_STAT_CONFIG;
		skeletonHpFlat +=
			usc.skeleton.hp.base + ws.skeleton.hp * usc.skeleton.hp.perLevel;
		skeletonDamageFlat +=
			usc.skeleton.dmg.base + ws.skeleton.dmg * usc.skeleton.dmg.perLevel;
		skeletonSpeedFlat +=
			usc.skeleton.speed.base + ws.skeleton.speed * usc.skeleton.speed.perLevel;
		zombieHpFlat += usc.zombie.hp.base + ws.zombie.hp * usc.zombie.hp.perLevel;
		zombieDamageFlat +=
			usc.zombie.dmg.base + ws.zombie.dmg * usc.zombie.dmg.perLevel;
		zombieSpeedFlat +=
			usc.zombie.speed.base + ws.zombie.speed * usc.zombie.speed.perLevel;
		wraithHpFlat += usc.wraith.hp.base + ws.wraith.hp * usc.wraith.hp.perLevel;
		wraithDamageFlat +=
			usc.wraith.dmg.base + ws.wraith.dmg * usc.wraith.dmg.perLevel;
		wraithSpeedFlat +=
			usc.wraith.speed.base + ws.wraith.speed * usc.wraith.speed.perLevel;
		maxSquadSize += ws.crypt.squadSize;
		squadTravelSpeedBonus += ws.crypt.travelSpeed * 0.08; // 8% travel speed per level

		gardenBonesPerTick = gardenTotalYield(ws.garden) / 10;
	}

	// Apply relic effects from equipped relics
	for (const [_slotId, relicId] of Object.entries(equipped)) {
		if (!relicId) continue;
		const relic = inventory.find((r) => r.id === relicId);
		if (!relic) continue;

		const upgradeMultiplier = 1 + relic.upgradeLevel * 0.1;
		const applyAffix = (affixId: string, value: number) => {
			const boosted = (value * upgradeMultiplier) / 100; // convert % to decimal
			switch (affixId) {
				case "boneYield":
					boneYieldBonus += boosted;
					break;
				case "coinYield":
					coinYieldBonus += boosted;
					break; // retired affix — still honoured on relics rolled before it went
				case "soulYield":
					soulsYieldBonus += boosted;
					break;
				case "corpseYield":
					corpseYieldBonus += boosted;
					break;
				case "squadSizeBonus":
					maxSquadSize += Math.floor(maxSquadSize * boosted);
					break; // convert back to flat squad size
				case "squadTravelSpeed":
					squadTravelSpeedBonus += boosted;
					break;
				case "summonCost":
					summonCostBonus += boosted;
					break;
				case "rarityWeight":
					break; // handled in gacha
				case "skeletonDamage":
					skeletonDamageBonus += boosted;
					break;
				case "skeletonHp":
					skeletonHpBonus += boosted;
					break;
				case "skeletonSpeed":
					skeletonSpeedBonus += boosted;
					break; // would affect speed multiplier
				case "zombieDamage":
					zombieDamageBonus += boosted;
					break;
				case "zombieHp":
					zombieHpBonus += boosted;
					break;
				case "wraithDamage":
					wraithDamageBonus += boosted;
					break;
				case "wraithHp":
					wraithHpBonus += boosted;
					break;
				case "wraithSpeed":
					wraithSpeedBonus += boosted;
					break;
				case "boneYieldFromKills":
					break; // TODO REWORK: should grant bones per kill, not passive income

				case "soulOnKill":
					soulHarvestBonus += boosted * 2;
					break;
			}
		};

		applyAffix(relic.mainAffix.id, relic.mainAffix.value);
		for (const minor of relic.minorAffixes) {
			applyAffix(minor.id, minor.value);
		}
	}

	return {
		bonesPerTick: gardenBonesPerTick * bonesPassiveMult,
		coinsPerTick,
		soulsPerTick,
		boneYieldBonus,
		coinYieldBonus,
		soulsYieldBonus,
		corpseYieldBonus,
		maxSquadSize,
		maxSquads,
		zombiesUnlocked,
		wraithsUnlocked,
		autoDeploy,
		boneSurgeActive,
		soulHarvestBonus,
		rarityBoostActive,

		skeleton: {
			hpFlat: skeletonHpFlat,
			hpBonus: skeletonHpBonus,
			dmgFlat: skeletonDamageFlat,
			dmgBonus: skeletonDamageBonus,
			speedFlat: skeletonSpeedFlat,
			speedBonus: skeletonSpeedBonus,
		},

		zombie: {
			hpFlat: zombieHpFlat,
			hpBonus: zombieHpBonus,
			dmgFlat: zombieDamageFlat,
			dmgBonus: zombieDamageBonus,
			speedFlat: zombieSpeedFlat,
			speedBonus: zombieSpeedBonus,
		},

		wraith: {
			hpFlat: wraithHpFlat,
			hpBonus: wraithHpBonus,
			dmgFlat: wraithDamageFlat,
			dmgBonus: wraithDamageBonus,
			speedFlat: wraithSpeedFlat,
			speedBonus: wraithSpeedBonus,
		},

		squadTravelSpeedBonus,
		summonCostBonus,
		combatSpeedMultiplier: 1,
	};
}

export function canPurchaseUpgrade(state: GameState, nodeId: string): boolean {
	const node = UPGRADE_NODES.find((n) => n.id === nodeId);
	if (!node) return false;
	if (state.upgrades.purchased.includes(nodeId)) return false;
	if (!canAffordCost(upgradeCost(node), state.resources)) return false;
	for (const prereq of node.prerequisites) {
		if (!state.upgrades.purchased.includes(prereq)) return false;
	}
	return true;
}

export { UPGRADE_NODES };
