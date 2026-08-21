/**
 * A run, simulated from the prices and the payouts the game actually charges.
 *
 * No build is written down here. The run starts at the new-game state, farms
 * whatever it can already clear, and spends every bone on the purchase with the
 * best marginal gain per bone: stat tracks and squad size priced through
 * `power`, income tracks priced through the loot they speed up. Banners buy the
 * cheapest node the tree will sell. Whether a dungeon can be entered is never
 * modelled, only measured: the engine is asked, at the squad the run can field.
 *
 * The one heuristic is the exchange rate between the two kinds of purchase: a
 * doubling of income is valued like a doubling of power.
 *
 * A squad is not a fixed thing. One vanguard is held at the crypt's limit and
 * pushes the ladder; every further circle is a detachment raised at the size its
 * own dungeon asks for, which on an old room is a handful of skeletons.
 *
 * The run fields skeletons, the unit every threshold is measured on, and pulls
 * no relics, so no dust is ever earned or spent. What the other two units would
 * change, the undying wraith above all, sits outside what this prices.
 * `TRACE=1` prints a line per purchase, `TRACE=2` adds every candidate.
 */

import { DUNGEON_DEFS } from "../../src/game/data/dungeons";
import { BANNERS_PER_TIER } from "../../src/game/data/economy";
import { TICKS_PER_SECOND } from "../../src/game/data/pacing";
import { UNIT_STAT_CONFIG } from "../../src/game/data/units";
import { UPGRADE_NODES } from "../../src/game/data/upgrades";
import {
	canPurchaseUpgrade,
	upgradeCost,
	upgradeTimesBought,
} from "../../src/game/rules/derived";
import { projectLoot } from "../../src/game/rules/loot";
import { applyCost } from "../../src/game/rules/resources";
import { summonCost } from "../../src/game/rules/summoning";
import { travelLegTicks } from "../../src/game/rules/travel";
import { checkUnlockConditions } from "../../src/game/rules/unlocks";
import {
	cryptCost,
	GARDEN_PLOTS,
	gardenCost,
	squadSizeFromLevel,
	unitStatCost,
} from "../../src/game/rules/workshop";
import type {
	DungeonDef,
	GameState,
	Resources,
	UpgradeNode,
} from "../../src/game/types";
import { comp, isAuto, seedsFor, sweep, WIN_RATE } from "./fights";
import { enemyPower, type PowerModel, statPower } from "./power";
import { newRun, sync } from "./state";

const TICKS_PER_HOUR = 3600 * TICKS_PER_SECOND;

/** Power growth between two probes of the dungeon the run is trying to open. */
const NEAR_STEP = 1.15;
/** The same while the model still puts that dungeon out of reach. */
const FAR_STEP = 2;
/** Share of the predicted requirement past which probing goes fine-grained. */
const NEAR = 0.6;
/** Power growth after which a farmed dungeon's clear time is measured again. */
const FARM_STEP = 2;

/** How much a circle that still loses skeletons is grown by, and how often. */
const REINFORCE_STEP = 1.3;
const REINFORCE_TRIES = 3;

/** Shortest span a run underwater farms before its clear count is re-priced. */
const UNDERWATER_STEP = 0.25;

const HOUR_CAP = 1e5;
const STEP_CAP = 20000;
const SQUAD_CAP = 2000;

export interface Reading {
	winRate: number;
	mortalLost: number;
	durationSec: number;
	/** Model power the reading was taken at, so staleness is measurable. */
	power: number;
	squad: number;
}

export interface Milestone {
	def: DungeonDef;
	/** Hours of play when the dungeon first ran clean. */
	hours: number;
	squad: number;
	/** Squads out at the time, each holding a dungeon of its own. */
	squads: number;
	/** Model power the dungeon asked for, so a later build can re-price it. */
	need: number;
	/** The run's state at that moment, for the threshold pass to re-enter. */
	state: GameState;
	/** What the run was earning then, across every squad it had out. */
	bonesPerHour: number;
}

/** A circle beyond the vanguard: its own dungeon, its own size, its own reading. */
interface Detachment {
	def: DungeonDef;
	size: number;
	reading: Reading;
}

interface Sim {
	model: PowerModel;
	defs: DungeonDef[];
	state: GameState;
	hours: number;
	readings: Map<string, Reading>;
	detachments: Detachment[];
	milestones: Map<string, Milestone>;
	farmedAt: Map<string, number>;
	banners: number;
	earned: number;
	bailout: number;
	underwater: number;
	spend: Map<string, number>;
	treeDoneHours: number | null;
	stall: string | null;
}

export interface Progression {
	milestones: Map<string, Milestone>;
	farmedAt: Map<string, number>;
	hours: number;
	bannersEarned: number;
	/** Bones the farming delivered, after the dead were replaced. */
	earned: number;
	/** Bones the run had to be given, because the farming did not cover them. */
	bailout: number;
	/** Hours spent farming a dungeon that cost more than it paid. */
	underwater: number;
	treeDoneHours: number | null;
	spend: Map<string, number>;
	stall: string | null;
	final: GameState;
	/** The circles the run ended with, the vanguard first. */
	squads: { name: string; size: number }[];
}

function dungeonState(sim: Sim, id: string) {
	const found = sim.state.dungeons.find((d) => d.id === id);
	if (!found) throw new Error(`no dungeon state for ${id}`);
	return found;
}

function unlockedDefs(sim: Sim): DungeonDef[] {
	return sim.defs.filter((d) => dungeonState(sim, d.id).unlocked);
}

function detached(sim: Sim): number {
	return sim.detachments.reduce((n, d) => n + d.size, 0);
}

/** The vanguard: whatever the crypt allows of what the detachments left over. */
function squadSize(sim: Sim): number {
	return Math.min(
		sim.state.derived.maxSquadSize,
		sim.state.units.skeleton - detached(sim),
	);
}

function squadCount(sim: Sim): number {
	return 1 + sim.detachments.length;
}

/** Skeletons still to raise to bring the vanguard up to `size`. */
function hiresFor(sim: Sim, size: number): number {
	return Math.max(0, size - squadSize(sim));
}

function summonBones(sim: Sim, count: number): number {
	if (count <= 0) return 0;
	return summonCost("skeleton", count, sim.state).bones ?? 0;
}

function power(sim: Sim, tier: number): number {
	return sim.model.power(sim.state, squadSize(sim), tier);
}

interface Yield {
	winRate: number;
	bones: number;
	banners: number;
	corpses: number;
	souls: number;
	clears: number;
	/** Units the dungeon eats per hour, which the pool pays for, not the loot. */
	attrition: number;
}

const NO_YIELD: Yield = {
	winRate: 0,
	bones: 0,
	banners: 0,
	corpses: 0,
	souls: 0,
	clears: 0,
	attrition: 0,
};

/**
 * What one squad holding this dungeon pays per hour. Loot only lands on a win,
 * losses are averaged over both outcomes, and a wipe costs the whole squad.
 */
function farmYield(sim: Sim, def: DungeonDef, r: Reading | undefined): Yield {
	if (!r || r.winRate <= 0) return NO_YIELD;
	const d = sim.state.derived;
	const trip =
		2 * travelLegTicks(def, d.squadTravelSpeedBonus) +
		r.durationSec * TICKS_PER_SECOND;
	const clears = (TICKS_PER_HOUR / trip) * r.winRate;
	const attempts = TICKS_PER_HOUR / trip;
	const loot = projectLoot(def, dungeonState(sim, def.id).clearCount, d);
	return {
		winRate: r.winRate,
		bones: clears * ((loot.bonesMin + loot.bonesMax) / 2),
		banners: clears * (def.tier * BANNERS_PER_TIER + d.bannerChanceBonus),
		corpses: clears * loot.corpses,
		souls: clears * loot.soulChance * loot.soulsPerDrop,
		clears,
		attrition: attempts * r.mortalLost * (1 - d.reanimateChance),
	};
}

/** Bones an hour of this dungeon leaves behind once its dead are replaced. */
function netBones(sim: Sim, y: Yield): number {
	return y.bones - y.attrition * summonBones(sim, 1);
}

/** Clears still owed on this dungeon by something that unlocks behind it. */
function gateShortfall(sim: Sim, def: DungeonDef): number {
	let short = 0;
	for (const other of sim.defs) {
		if (dungeonState(sim, other.id).unlocked) continue;
		for (const cond of other.unlockCondition) {
			if (cond.dungeonId !== def.id) continue;
			short = Math.max(
				short,
				cond.count - dungeonState(sim, def.id).clearCount,
			);
		}
	}
	return Math.max(0, short);
}

/** A circle as the planner sees it: the vanguard, or a detachment on its room. */
interface Squad {
	size: number;
	/** The vanguard alone may march on a room nobody has run clean yet. */
	lead: boolean;
	room?: string;
	reading?: Reading;
}

interface Farm {
	def: DungeonDef;
	yield: Yield;
	squad: Squad;
}

interface Plan {
	farms: Farm[];
	/** Loot, before the dead are replaced. */
	bones: number;
	banners: number;
	corpses: number;
	souls: number;
	attrition: number;
	/** What is left once they are. Negative means the run is farming at a loss. */
	net: number;
	/** Hours until a room being held stops owing unlock clears, and the plan moves. */
	gateHours: number;
}

function allSquads(sim: Sim): Squad[] {
	return [
		{ size: squadSize(sim), lead: true },
		...sim.detachments.map((d) => ({
			size: d.size,
			lead: false,
			room: d.def.id,
			reading: d.reading,
		})),
	];
}

/** Whether a reading taken at one size still speaks for a squad of another. */
function speaksFor(r: Reading, size: number): boolean {
	return Math.abs(r.squad - size) <= 0.1 * size;
}

/**
 * What this squad would bring in on this room, or null if it has no business
 * there. A measured sweep is used where one fits the size; past that, a room the
 * run has already taken clean is projected at the head count the model says it
 * now asks for.
 */
function yieldFor(sim: Sim, squad: Squad, def: DungeonDef): Yield | null {
	const seen =
		squad.room === def.id
			? squad.reading
			: squad.lead
				? sim.readings.get(def.id)
				: undefined;
	if (seen && speaksFor(seen, squad.size)) return farmYield(sim, def, seen);

	const need = sim.milestones.has(def.id) ? needFor(sim, def) : null;
	if (need === null || squad.size < need) return null;
	return projectedYield(sim, def, squad.size);
}

/**
 * One squad to a room, best pairing first. A room eating more than it pays is
 * still run when it is the best on offer: the bones bank while the pool bleeds,
 * which is the choice the run then faces.
 */
function assign(sim: Sim, squads: Squad[]): Farm[] {
	const pairs: { farm: Farm; gate: number; score: number }[] = [];
	for (const squad of squads) {
		for (const def of unlockedDefs(sim)) {
			const y = yieldFor(sim, squad, def);
			if (!y || y.bones <= 0) continue;
			// A room owing unlock clears is taken first, but only once it falls
			// reliably: a gate is no reason to feed a squad to it.
			const gate = gateShortfall(sim, def) > 0 && y.winRate >= WIN_RATE;
			pairs.push({
				farm: { def, yield: y, squad },
				gate: gate ? 0 : 1,
				score: netBones(sim, y),
			});
		}
	}
	pairs.sort((a, b) => a.gate - b.gate || b.score - a.score);

	const farms: Farm[] = [];
	const busy = new Set<Squad>();
	const taken = new Set<string>();
	for (const p of pairs) {
		if (busy.has(p.farm.squad) || taken.has(p.farm.def.id)) continue;
		busy.add(p.farm.squad);
		taken.add(p.farm.def.id);
		farms.push(p.farm);
	}
	return farms;
}

function plan(sim: Sim, squads: Squad[] = allSquads(sim)): Plan {
	const farms = assign(sim, squads.slice(0, sim.state.derived.maxSquads));

	const total = (pick: (y: Yield) => number) =>
		farms.reduce((sum, f) => sum + pick(f.yield), 0);

	const bones =
		total((y) => y.bones) + sim.state.derived.bonesPerTick * TICKS_PER_HOUR;
	const attrition = total((y) => y.attrition);
	const gateHours = farms.reduce((soonest, f) => {
		const short = gateShortfall(sim, f.def);
		if (short <= 0 || f.yield.clears <= 0) return soonest;
		return Math.min(soonest, short / f.yield.clears);
	}, Number.POSITIVE_INFINITY);

	return {
		farms,
		bones,
		banners: total((y) => y.banners),
		corpses: total((y) => y.corpses),
		souls: total((y) => y.souls),
		attrition,
		net: bones - attrition * summonBones(sim, 1),
		gateHours,
	};
}

/**
 * Squads march out full, so the dead are replaced as they fall and the loot pays
 * for it. What the loot cannot cover is bailed out and counted: a run that needs
 * a bailout is one the economy does not carry.
 */
function elapse(sim: Sim, hours: number, p: Plan): void {
	if (!(hours > 0)) return;
	sim.hours += hours;
	const res = sim.state.resources;
	sim.earned += Math.max(0, p.net) * hours;
	res.bones += p.net * hours;
	if (res.bones < 0) {
		sim.bailout -= res.bones;
		res.bones = 0;
	}
	res.banners += p.banners * hours;
	res.corpses += p.corpses * hours;
	res.souls += p.souls * hours;
	sim.banners += p.banners * hours;
	for (const f of p.farms) {
		dungeonState(sim, f.def.id).clearCount += f.yield.clears * hours;
	}
	sim.state.dungeons = checkUnlockConditions(sim.state.dungeons);
}

/** Where the ladder puts a dungeon, read off the hardest one already run clean. */
function predict(sim: Sim, def: DungeonDef): number {
	let best: Milestone | null = null;
	for (const m of sim.milestones.values()) {
		if (!best || enemyPower(m.def) > enemyPower(best.def)) best = m;
	}
	if (!best) return 0;
	const ref = sim.model.power(best.state, best.squad, def.tier);
	return ref * (enemyPower(def) / enemyPower(best.def));
}

/** One sweep at `squad`, and whatever it settles about the dungeon. */
function measureAt(sim: Sim, def: DungeonDef, squad: number): Reading {
	// The same seeds the threshold pass uses, so its AUTO lands where this did.
	const s = sweep(comp(squad), def, sim.state, seedsFor(squad, def));
	const power = sim.model.power(sim.state, squad, def.tier);
	if (s.winRate >= WIN_RATE && !sim.farmedAt.has(def.id)) {
		sim.farmedAt.set(def.id, sim.hours);
	}
	if (isAuto(s) && !sim.milestones.has(def.id)) {
		sim.milestones.set(def.id, {
			def,
			hours: sim.hours,
			squad,
			squads: squadCount(sim),
			need: power,
			state: structuredClone(sim.state),
			bonesPerHour: plan(sim).net,
		});
	}
	return { ...s, power, squad };
}

function measure(sim: Sim, def: DungeonDef, squad: number): void {
	sim.readings.set(def.id, measureAt(sim, def, squad));
}

/**
 * Squad the model puts at a dungeon's requirement under the build in hand. The
 * requirement was measured when the dungeon first ran clean; stats bought since
 * come off the head count it takes.
 */
function needFor(sim: Sim, def: DungeonDef): number | null {
	const m = sim.milestones.get(def.id);
	if (!m) return null;
	const alpha = sim.model.alpha(def.tier);
	const stats = statPower(sim.state) ** sim.model.beta;
	const size = Math.ceil((m.need / stats) ** (1 / alpha));
	if (size > sim.state.derived.maxSquadSize) return null;
	return Math.max(2, size);
}

/**
 * What a squad of `size` would bring in on a room it can already run clean. The
 * clear time is the vanguard's, stretched by how much smaller the detachment is.
 */
function projectedYield(sim: Sim, def: DungeonDef, size: number): Yield {
	const seen = sim.readings.get(def.id);
	const durationSec = seen ? (seen.durationSec * seen.squad) / size : 30;
	return farmYield(sim, def, {
		winRate: 1,
		mortalLost: 0,
		durationSec,
		power: 0,
		squad: size,
	});
}

/**
 * The engine calls: the dungeon the run is trying to open, probed harder as the
 * model says it is getting close, and the dungeons being farmed, whose clear
 * times and losses fall as the build grows under them.
 */
function probe(sim: Sim): void {
	const size = squadSize(sim);
	const done = new Set<string>();

	const next = unlockedDefs(sim)
		.filter((d) => !sim.milestones.has(d.id))
		.sort((a, b) => enemyPower(a) - enemyPower(b))[0];
	if (next) {
		const p = power(sim, next.tier);
		const r = sim.readings.get(next.id);
		const req = predict(sim, next);
		const step = req > 0 && p < NEAR * req ? FAR_STEP : NEAR_STEP;
		if (!r || p >= r.power * step || p <= r.power / step) {
			measure(sim, next, size);
			done.add(next.id);
		}
	}

	const lead = plan(sim).farms.find((f) => f.squad.lead);
	if (lead && !done.has(lead.def.id)) {
		const r = sim.readings.get(lead.def.id);
		const p = power(sim, lead.def.tier);
		if (r && (p >= r.power * FARM_STEP || p <= r.power / FARM_STEP)) {
			measure(sim, lead.def, size);
		}
	}

	// A detachment holds its size, so only the build moving re-prices its room.
	for (const det of sim.detachments) {
		const p = sim.model.power(sim.state, det.size, det.def.tier);
		if (p >= det.reading.power * FARM_STEP) {
			det.reading = measureAt(sim, det.def, det.size);
		}
	}
}

/** Bones taken outside a priced purchase, bailed out like any other shortfall. */
function charge(sim: Sim, bones: number, label: string): void {
	const res = sim.state.resources;
	res.bones -= bones;
	if (res.bones < 0) {
		sim.bailout -= res.bones;
		res.bones = 0;
	}
	sim.spend.set(label, (sim.spend.get(label) ?? 0) + bones);
}

/**
 * Put a circle on a room and grow it until it holds the room clean. The size
 * comes off the model, so the sweep is what settles it: a circle that still
 * loses skeletons is reinforced rather than left to bleed.
 */
function raise(
	sim: Sim,
	def: DungeonDef,
	size: number,
	label: string,
): Detachment {
	let n = size;
	for (let tries = 0; ; tries++) {
		const reading = measureAt(sim, def, n);
		const bigger = Math.min(
			sim.state.derived.maxSquadSize,
			Math.ceil(n * REINFORCE_STEP),
		);
		if (isAuto(reading) || bigger === n || tries >= REINFORCE_TRIES) {
			return { def, size: n, reading };
		}
		charge(sim, summonBones(sim, bigger - n), label);
		sim.state.units.skeleton += bigger - n;
		n = bigger;
	}
}

/** The distinct sizes worth pricing, since many rooms ask for the same one. */
function dedupe(sizes: number[]): number[] {
	return [...new Set(sizes)];
}

/** Raise a circle of `size` and send it wherever the planner puts it. */
function openCircle(sim: Sim, size: number): void {
	sim.state.units.skeleton += size;
	const squad: Squad = { size, lead: false };
	const room = plan(sim, [...allSquads(sim), squad]).farms.find(
		(f) => f.squad === squad,
	);
	if (!room) return;
	sim.detachments.push(raise(sim, room.def, size, "circles"));
}

/** Move a circle to whatever room its new size makes it worth the most on. */
function retask(sim: Sim, det: Detachment): void {
	const squad: Squad = { size: det.size, lead: false };
	const others = allSquads(sim).filter((s) => s.room !== det.def.id);
	const room = plan(sim, [...others, squad]).farms.find(
		(f) => f.squad === squad,
	);
	if (!room) return;
	Object.assign(det, raise(sim, room.def, det.size, "retask"));
}

interface Purchase {
	label: string;
	bones: number;
	/** Log gain, in power for a build purchase and in income for the rest. */
	gain: number;
	apply(): void;
}

/**
 * Net income after a level is taken on a track, with the level put back. Speed
 * cuts both ways here: more trips an hour is more loot and more dead.
 */
function incomeWith(
	sim: Sim,
	set: (level: number) => void,
	level: number,
): number {
	set(level + 1);
	sync(sim.state);
	const after = plan(sim).net;
	set(level);
	sync(sim.state);
	return after;
}

function candidates(sim: Sim): Purchase[] {
	const state = sim.state;
	const ws = state.workshop;
	const pending = sim.defs.filter((d) => !sim.milestones.has(d.id));
	const tier = pending.length > 0 ? pending[0].tier : sim.defs[0].tier;
	const alpha = sim.model.alpha(tier);
	const size = squadSize(sim);
	const squads = squadCount(sim);
	// Underwater there is no income to improve, only a fight to win.
	const now = plan(sim).net;
	const income = now > 0;
	const out: Purchase[] = [];

	for (const stat of ["hp", "dmg"] as const) {
		const level = ws.skeleton[stat];
		out.push({
			label: stat,
			bones: unitStatCost("skeleton", stat, level).bones ?? 0,
			gain:
				sim.model.beta * Math.log(UNIT_STAT_CONFIG.skeleton[stat].statGrowth),
			apply: () => {
				ws.skeleton[stat] = level + 1;
			},
		});
	}

	// A wider circle is only ever bought with the recruits that fill it.
	{
		const level = ws.crypt.squadSize;
		const step = squadSizeFromLevel(level + 1) - squadSizeFromLevel(level);
		const hires = hiresFor(sim, state.derived.maxSquadSize + step);
		out.push({
			label: "squad size",
			bones:
				(cryptCost("squadSize", level).bones ?? 0) + summonBones(sim, hires),
			gain: alpha * Math.log((size + step) / size),
			apply: () => {
				ws.crypt.squadSize = level + 1;
				state.units.skeleton += hires;
			},
		});
	}

	// Places the tree opens stand empty until they are raised.
	{
		const hires = hiresFor(sim, state.derived.maxSquadSize);
		if (hires > 0) {
			out.push({
				label: "recruits",
				bones: summonBones(sim, hires),
				gain: alpha * Math.log(state.derived.maxSquadSize / size),
				apply: () => {
					state.units.skeleton += hires;
				},
			});
		}
	}

	// A further circle is raised at the size its own room asks for, which on a
	// room the run has outgrown is a handful of skeletons against a whole squad
	// of loot. Re-tasking one is the same purchase, less what it already holds.
	// A further circle is raised at the size some room it can hold asks for,
	// which on a room the run has outgrown is a handful of skeletons against a
	// squad's worth of loot. The rooms are already engine-measured, so the size
	// comes off the model and the sweep that opens the circle confirms it.
	if (income) {
		const idle = plan(sim).farms.length < allSquads(sim).length;
		const sizes = sim.defs
			.filter((d) => sim.milestones.has(d.id))
			.map((d) => needFor(sim, d))
			.filter((n): n is number => n !== null)
			.sort((a, b) => a - b);

		if (!idle && squads < state.derived.maxSquads && sizes.length > 0) {
			for (const size of dedupe(sizes)) {
				const after = plan(sim, [...allSquads(sim), { size, lead: false }]).net;
				const bones = summonBones(sim, size);
				if (after <= now || bones <= 0) continue;
				out.push({
					label: "circles",
					bones,
					gain: Math.log(after / now),
					apply: () => openCircle(sim, size),
				});
			}
		}

		// A circle already out marches on a better room once it is big enough.
		const weakest = [...sim.detachments].sort(
			(a, b) =>
				netBones(sim, farmYield(sim, a.def, a.reading)) -
				netBones(sim, farmYield(sim, b.def, b.reading)),
		)[0];
		if (weakest) {
			for (const size of dedupe(sizes.filter((n) => n > weakest.size))) {
				const others = allSquads(sim).filter((s) => s.room !== weakest.def.id);
				const after = plan(sim, [...others, { size, lead: false }]).net;
				const bones = summonBones(sim, size - weakest.size);
				if (after <= now || bones <= 0) continue;
				out.push({
					label: "retask",
					bones,
					gain: Math.log(after / now),
					apply: () => {
						state.units.skeleton += size - weakest.size;
						weakest.size = size;
						retask(sim, weakest);
					},
				});
			}
		}
	}

	if (income) {
		const level = ws.crypt.travelSpeed;
		const after = incomeWith(
			sim,
			(l) => {
				ws.crypt.travelSpeed = l;
			},
			level,
		);
		out.push({
			label: "travel",
			bones: cryptCost("travelSpeed", level).bones ?? 0,
			gain: Math.log(after / now),
			apply: () => {
				ws.crypt.travelSpeed = level + 1;
			},
		});
	}

	if (income) {
		const level = ws.garden.bones;
		const after = incomeWith(
			sim,
			(l) => {
				ws.garden.bones = l;
			},
			level,
		);
		out.push({
			label: "garden",
			bones: gardenCost("bones", level).bones ?? 0,
			gain: Math.log(after / now),
			apply: () => {
				ws.garden.bones = level + 1;
			},
		});
	}

	return out.filter((c) => c.bones > 0 && c.gain > 0);
}

/** Held back for the cheapest node that still wants this resource. */
function reserved(sim: Sim, key: keyof Resources): number {
	const bought = sim.state.upgrades.purchased;
	let most = 0;
	for (const node of UPGRADE_NODES) {
		if (bought.includes(node.id)) continue;
		if (!node.prerequisites.every((p) => bought.includes(p))) continue;
		most = Math.max(most, node.cost[key] ?? 0);
	}
	return most;
}

/** The finite board first, then the rite that can always be performed again. */
function spendBanners(sim: Sim): void {
	const priced = (node: UpgradeNode) =>
		upgradeCost(node, upgradeTimesBought(sim.state, node.id));
	for (;;) {
		const node = UPGRADE_NODES.filter((n) =>
			canPurchaseUpgrade(sim.state, n.id),
		).sort(
			(a, b) =>
				(a.repeatGrowth ? 1 : 0) - (b.repeatGrowth ? 1 : 0) ||
				(priced(a).banners ?? 0) - (priced(b).banners ?? 0),
		)[0];
		if (!node) return;

		sim.state.resources = applyCost(priced(node), sim.state.resources);
		if (sim.state.upgrades.purchased.includes(node.id)) {
			sim.state.upgrades.repeats ??= {};
			const repeats = sim.state.upgrades.repeats;
			repeats[node.id] = (repeats[node.id] ?? 0) + 1;
		} else {
			sim.state.upgrades.purchased.push(node.id);
		}
		sync(sim.state);

		if (
			sim.treeDoneHours === null &&
			UPGRADE_NODES.every(
				(n) => n.repeatGrowth || sim.state.upgrades.purchased.includes(n.id),
			)
		) {
			sim.treeDoneHours = sim.hours;
		}
	}
}

/** Corpses and souls have no other sink in a bone army, so they grow bones. */
function spendSideResources(sim: Sim): void {
	for (const plot of GARDEN_PLOTS) {
		if (plot.id === "bones") continue;
		for (;;) {
			const level = sim.state.workshop.garden[plot.id];
			const need = gardenCost(plot.id, level)[plot.id] ?? 0;
			const spare = sim.state.resources[plot.id] - reserved(sim, plot.id);
			if (need <= 0 || spare < need) break;
			sim.state.resources[plot.id] -= need;
			sim.state.workshop.garden[plot.id] = level + 1;
			sync(sim.state);
		}
	}
}

/** One line per purchase, to stderr, when the run is asked for its working. */
function trace(sim: Sim, p: Plan, buy: Purchase): void {
	if (!process.env.TRACE) return;
	const n = (x: number) => x.toFixed(0);
	if (process.env.TRACE === "2") {
		const ws = sim.state.workshop;
		console.error(
			`  cand ${candidates(sim)
				.map((c) => `${c.label}=${(c.gain / c.bones).toExponential(1)}`)
				.join(
					" ",
				)} | maxSquads=${sim.state.derived.maxSquads} garden=${JSON.stringify(ws.garden)} res=${JSON.stringify(
				Object.fromEntries(
					Object.entries(sim.state.resources).map(([k, v]) => [
						k,
						Math.round(v),
					]),
				),
			)}`,
		);
	}
	console.error(
		[
			`h=${sim.hours.toFixed(2)}`,
			`squads=${[squadSize(sim), ...sim.detachments.map((d) => d.size)].join("+")}`,
			`bones=${n(sim.state.resources.bones)}`,
			`gross=${n(p.bones)}`,
			`net=${n(p.net)}`,
			`lost/h=${p.attrition.toFixed(1)}@${n(summonBones(sim, 1))}`,
			`on=${p.farms.map((f) => f.def.id).join(",")}`,
			`buy=${buy.label}@${n(buy.bones)}`,
			`bail=${n(sim.bailout)}`,
		].join(" "),
	);
}

export function simulate(model: PowerModel, maxTier: number): Progression {
	const sim: Sim = {
		model,
		defs: Object.values(DUNGEON_DEFS).filter((d) => d.tier <= maxTier),
		state: newRun(),
		hours: 0,
		readings: new Map(),
		detachments: [],
		milestones: new Map(),
		farmedAt: new Map(),
		banners: 0,
		earned: 0,
		bailout: 0,
		underwater: 0,
		spend: new Map(),
		treeDoneHours: null,
		stall: null,
	};

	for (let step = 0; step < STEP_CAP; step++) {
		if (squadSize(sim) < 1) {
			sim.stall = "the pool ran dry";
			break;
		}
		probe(sim);
		if (sim.defs.every((d) => sim.milestones.has(d.id))) break;

		const p = plan(sim);
		if (!(p.bones > 0)) {
			sim.stall = `no dungeon pays at ${squadSize(sim)} units`;
			break;
		}

		const options = candidates(sim);
		if (options.length === 0) {
			sim.stall = "nothing left to buy";
			break;
		}
		const buy = options.reduce((best, c) =>
			c.gain / c.bones > best.gain / best.bones ? c : best,
		);

		trace(sim, p, buy);
		const short = buy.bones - sim.state.resources.bones;
		if (short > 0) {
			// Underwater, saving is impossible: farm on, and let the clear count
			// climb until the same dungeon pays for its own dead. The span grows
			// with the clock, since the payout curve flattens as it goes.
			const wait =
				p.net > 0 ? short / p.net : Math.max(UNDERWATER_STEP, sim.hours / 4);
			// An unlock landing mid-span re-plans the whole map, so stop there.
			const span = Math.min(wait, p.gateHours);
			if (p.net <= 0) sim.underwater += span;
			elapse(sim, span, p);
			spendBanners(sim);
			spendSideResources(sim);
			if (p.net <= 0 || span < wait) continue;
		}
		sim.state.resources.bones -= buy.bones;
		buy.apply();
		sync(sim.state);
		sim.spend.set(buy.label, (sim.spend.get(buy.label) ?? 0) + buy.bones);

		spendBanners(sim);
		spendSideResources(sim);

		if (sim.hours > HOUR_CAP) {
			sim.stall = `past ${HOUR_CAP} hours`;
			break;
		}
		if (squadSize(sim) > SQUAD_CAP) {
			sim.stall = `past ${SQUAD_CAP} units in a squad`;
			break;
		}
	}

	return {
		milestones: sim.milestones,
		farmedAt: sim.farmedAt,
		hours: sim.hours,
		bannersEarned: sim.banners,
		earned: sim.earned,
		bailout: sim.bailout,
		underwater: sim.underwater,
		treeDoneHours: sim.treeDoneHours,
		spend: sim.spend,
		stall: sim.stall,
		squads: plan(sim).farms.map((f) => ({
			name: f.def.name,
			size: f.squad.size,
		})),
		final: sim.state,
	};
}
