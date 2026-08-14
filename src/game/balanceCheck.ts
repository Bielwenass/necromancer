/**
 * Balance calibration harness. `bunx tsx src/game/balanceCheck.ts [tier]`. Drives
 * the real engine through the real `recomputeDerived`. Two thresholds per
 * dungeon: WIN is the smallest squad that clears reliably, AUTO the smallest
 * that clears without losing a mortal unit. The gap is the design surface.
 */

import { COMBAT_CONFIG } from "../combat/config";
import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
	effectiveUnitStats,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { DUNGEON_DEFS } from "./data/dungeons";
import { BASE_MAX_SQUAD_SIZE, STARTING_DUNGEON_ID } from "./data/economy";
import { ENGINE_DT, MAX_HEADLESS_TICKS, TICKS_PER_SECOND } from "./data/pacing";
import { UNDYING_TYPES, UNIT_TYPES } from "./data/units";
import { UPGRADE_NODES } from "./data/upgrades";
import { recomputeDerived } from "./rules/derived";
import { clearMultiplier } from "./rules/loot";
import { makeDungeonState } from "./rules/unlocks";
import { cryptCost, unitStatCost } from "./rules/workshop";
import type { DungeonDef, GameState, UnitType } from "./types";

let failures = 0;

function check(name: string, ok: boolean, detail = ""): void {
	if (ok) {
		console.log(`  ok    ${name}`);
	} else {
		failures++;
		console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

type Comp = Record<UnitType, number>;

export function comp(skeleton: number, zombie = 0, wraith = 0): Comp {
	return { skeleton, zombie, wraith };
}

const mortalSize = (c: Comp) =>
	UNIT_TYPES.filter((t) => !UNDYING_TYPES.has(t)).reduce((n, t) => n + c[t], 0);

interface Build {
	purchased?: string[];
	w: number;
	crypt: number;
}

function makeState({ purchased, w, crypt }: Build): GameState {
	const base: Omit<GameState, "derived"> = {
		resources: { bones: 0, souls: 0, dust: 0, corpses: 0, banners: 0 },
		units: { skeleton: 0, zombie: 0, wraith: 0 },
		squads: [],
		dungeons: Object.values(DUNGEON_DEFS).map((d) => makeDungeonState(d, true)),
		relics: { inventory: [], equipped: {} },
		upgrades: { purchased: purchased ?? UPGRADE_NODES.map((n) => n.id) },
		gacha: {
			pityCounters: { banner: 0, carrion: 0, forbidden: 0 },
			lastPulledRelics: null,
			freePulls: 0,
			freePullTicks: 0,
		},
		workshop: {
			skeleton: { hp: w, dmg: w, speed: 0 },
			zombie: { hp: w, dmg: w, speed: 0 },
			wraith: { hp: w, dmg: w, speed: 0 },
			crypt: { squadSize: crypt, travelSpeed: 0 },
			garden: { bones: 0, souls: 0, dust: 0, corpses: 0 },
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: 0 },
	};
	return { ...base, derived: recomputeDerived(base as GameState) };
}

interface FightResult {
	win: boolean;
	/** Units that will not come home. Undying losses are free, so excluded. */
	mortalLost: number;
	durationSec: number;
}

function fight(
	c: Comp,
	def: DungeonDef,
	state: GameState,
	seed: number,
): FightResult {
	const engine = new CombatEngine({
		width: COMBAT_W,
		height: COMBAT_H,
		seed,
	});
	engine.setSide("a", buildAttackerConfig(c, state.derived));
	engine.setSide("b", buildDefenderConfig(def, state.derived));
	engine.start();

	let ticks = 0;
	while (engine.getWinner() === null && ticks < MAX_HEADLESS_TICKS) {
		engine.tick(ENGINE_DT);
		ticks++;
	}

	const win = engine.getWinner() === "a";
	const survivors = engine.getCounts().a;
	// Mirrors `compositionAfterFight`: the undying always reform.
	let home = 0;
	for (const type of UNIT_TYPES) {
		if (UNDYING_TYPES.has(type)) continue;
		home += win ? (survivors[type] ?? 0) : 0;
	}
	return {
		win,
		mortalLost: mortalSize(c) - home,
		durationSec: (ticks * ENGINE_DT) / 1000,
	};
}

interface Sweep {
	winRate: number;
	mortalLost: number;
	durationSec: number;
}

function sweep(
	c: Comp,
	def: DungeonDef,
	state: GameState,
	seeds: number,
): Sweep {
	let wins = 0;
	let lost = 0;
	let secs = 0;
	for (let i = 0; i < seeds; i++) {
		const r = fight(c, def, state, 1_000_003 + i * 7919);
		if (r.win) wins++;
		lost += r.mortalLost;
		secs += r.durationSec;
	}
	return {
		winRate: wins / seeds,
		mortalLost: lost / seeds,
		durationSec: secs / seeds,
	};
}

interface Thresholds {
	win: number | null;
	auto: number | null;
	durationSec: number;
}

/** Smallest squad clearing `>=90%`, then the smallest clearing losslessly. */
function thresholds(
	def: DungeonDef,
	state: GameState,
	cap: number,
): Thresholds {
	// Variance falls as the armies grow, so big fights get fewer seeds.
	const foes = def.enemies.reduce((n, e) => n + e.amount, 0);
	const seedsFor = (n: number) => (n + foes > 400 ? 3 : 5);
	const wins = (n: number) =>
		sweep(comp(n), def, state, seedsFor(n)).winRate >= 0.9;

	let hi = 2;
	while (hi <= cap && !wins(hi)) hi *= 2;
	if (hi > cap) return { win: null, auto: null, durationSec: 0 };

	let lo = Math.floor(hi / 2) + 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (wins(mid)) hi = mid;
		else lo = mid + 1;
	}
	const win = lo;

	// AUTO is not reliably monotone at single-unit resolution, so walk up.
	for (let n = win; n <= cap; n = Math.max(n + 1, Math.ceil(n * 1.12))) {
		const a = sweep(comp(n), def, state, seedsFor(n));
		if (a.winRate >= 0.9 && a.mortalLost < 0.5) {
			return { win, auto: n, durationSec: a.durationSec };
		}
	}
	return { win, auto: null, durationSec: 0 };
}

/**
 * Ceiling on one enemy blow (`dmg × interval`) as a share of a player unit's HP.
 * Above it a dungeon deletes a unit per blow at any squad size.
 */
const ONE_SHOT_LIMIT = 0.25;

function worstEnemySwing(def: DungeonDef, state: GameState): number {
	const interval = COMBAT_CONFIG.simulation.attackIntervalMs / 1000;
	const dmgMult = 1 - state.derived.enemyDmgPenalty;
	let worst = 0;
	for (const e of def.enemies) {
		const swing = e.stats.dmg * dmgMult * interval;
		if (swing > worst) worst = swing;
	}
	return worst;
}

function enemyPower(def: DungeonDef): number {
	let hp = 0;
	let dps = 0;
	for (const e of def.enemies) {
		hp += e.amount * e.stats.hp;
		dps += e.amount * e.stats.dmg;
	}
	return hp * dps;
}

/** What a player plausibly has on first reaching each tier. */
const TIER_ENTRY: Record<number, Build> = {
	1: { purchased: ["s1", "s3"], w: 3, crypt: 8 },
	2: { purchased: ["s1", "s2", "s3", "c3", "c4", "s7"], w: 12, crypt: 30 },
	3: { w: 26, crypt: 55 },
	4: { w: 40, crypt: 75 },
	5: { w: 52, crypt: 95 },
};

/**
 * The build at dungeon `index` of `tier`, a fraction of the way toward the next
 * tier's entry gear. A full span would cancel the difficulty ramp exactly.
 */
function buildFor(tier: number, index: number): Build {
	const a = TIER_ENTRY[tier];
	const b = TIER_ENTRY[tier + 1];
	const f = index / 8;
	const lerp = (x: number, y: number) => Math.round(x + (y - x) * f);
	return {
		purchased: a.purchased,
		w: lerp(a.w, b.w),
		crypt: lerp(a.crypt, b.crypt),
	};
}

const BAND_MIN_SQUAD = 8;

const TICKS_PER_HOUR = 3600 * TICKS_PER_SECOND;

/** Measured fight lengths per tier, in ticks; see section 1's `fight` column. */
const FIGHT_TICKS: Record<number, number> = {
	1: 180,
	2: 170,
	3: 210,
	4: 300,
};

/**
 * Only units in contact can swing, so the exponent pricing squad size against the
 * stat tracks is measured: scale a dungeon's power and watch the required squad.
 * If `squad ∝ power^a`, the exponent is `1/a`.
 */
function scaledDungeon(def: DungeonDef, powerMult: number): DungeonDef {
	// Power is HP × damage, so each carries half of a change.
	const k = Math.sqrt(powerMult);
	return {
		...def,
		enemies: def.enemies.map((e) => ({
			...e,
			stats: { ...e.stats, hp: e.stats.hp * k, dmg: e.stats.dmg * k },
		})),
	};
}

function reportSquadExponent(): void {
	console.log("\n8. What a bigger squad is worth\n");
	// Two scales: crowding bends the curve away from the square law.
	for (const [tier, id] of [
		[2, "watchers-spire"],
		[3, "ossuary-of-vael"],
	] as [number, string][]) {
		measureExponent(tier, DUNGEON_DEFS[id]);
	}
}

function measureExponent(tier: number, def: DungeonDef): void {
	const state = makeState(buildFor(tier, 0));
	const points: { mult: number; win: number }[] = [];
	console.log(`  ${def.name} (tier ${tier}):`);

	for (const mult of [0.25, 0.5, 1, 2, 4]) {
		const t = thresholds(
			scaledDungeon(def, mult),
			state,
			state.derived.maxSquadSize,
		);
		if (t.win !== null) points.push({ mult, win: t.win });
		console.log(
			`    power ×${String(mult).padEnd(5)} → squad ${t.win === null ? ">cap" : t.win}`,
		);
	}

	if (points.length < 3) {
		check("enough points to fit an exponent", false, `${points.length}`);
		return;
	}
	const n = points.length;
	const lx = points.map((p) => Math.log(p.mult));
	const ly = points.map((p) => Math.log(p.win));
	const mx = lx.reduce((a, b) => a + b, 0) / n;
	const my = ly.reduce((a, b) => a + b, 0) / n;
	let num = 0;
	let den = 0;
	for (let i = 0; i < n; i++) {
		num += (lx[i] - mx) * (ly[i] - my);
		den += (lx[i] - mx) ** 2;
	}
	const a = num / den;
	const exponent = 1 / a;
	console.log(`    ⇒ power ∝ squad^${exponent.toFixed(2)}\n`);
	check(
		`T${tier}: a bigger squad pays more than linearly`,
		exponent > 1.15,
		`squad^${exponent.toFixed(2)}`,
	);
	check(
		`T${tier}: squad size is not worth more than the square law`,
		exponent <= 2.15,
		`squad^${exponent.toFixed(2)} — above 2 the crypt track is underpriced`,
	);
}

/** Hours of play per tier; a semi-active day is ~12 simulated hours. */
const TARGET_HOURS: Record<number, number> = { 1: 5, 2: 26, 3: 80, 4: 200 };

/** Squads fielded concurrently at each tier, one dungeon each. */
const SQUADS_AT: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 5 };

/** Bones to reach a tier's entry build. Zombies open at s4, wraiths at s9. */
function buildCostBones(tier: number): number {
	const { w, crypt } = TIER_ENTRY[tier];
	let bones = 0;
	for (const unit of UNIT_TYPES.slice(0, Math.min(3, tier))) {
		for (const stat of ["hp", "dmg"] as const) {
			for (let l = 0; l < w; l++)
				bones += unitStatCost(unit, stat, l).bones ?? 0;
		}
	}
	for (let l = 0; l < crypt; l++) {
		bones += cryptCost("squadSize", l).bones ?? 0;
	}
	return bones;
}

/**
 * Whether the build that beats a tier is affordable in the intended time.
 * Analytic: it prices the reference builds against the tier below's bone income.
 */
function reportPacing(): void {
	console.log("\n7. Pacing — can the build be afforded in time?\n");
	console.log(
		`${"tier".padEnd(6)}${"bones/h".padStart(10)}${"banners/h".padStart(11)}` +
			`${"build cost".padStart(12)}${"hours".padStart(8)}${"cumulative".padStart(12)}`,
	);

	let cumulative = 0;
	let bannersEarned = 0;
	const cumulativeAt: Record<number, number> = {};

	for (const tier of [1, 2, 3, 4]) {
		const defs = Object.values(DUNGEON_DEFS).filter((d) => d.tier === tier);
		let bonesPerHour = 0;
		let bannersPerHour = 0;
		for (const d of defs) {
			// A round trip is out, fight, and back; the dungeon is held for all of it.
			const clears =
				TICKS_PER_HOUR / (2 * d.travelTimeTicks + FIGHT_TICKS[tier]);
			bonesPerHour +=
				clears *
				((d.lootTable.bonesMin + d.lootTable.bonesMax) / 2) *
				clearMultiplier(500);
			bannersPerHour += clears * d.tier;
		}
		const share = SQUADS_AT[tier] / defs.length;
		bonesPerHour *= share;
		bannersPerHour *= share;

		const cost = buildCostBones(tier + 1) - buildCostBones(tier);
		const hours = cost / bonesPerHour;
		cumulative += hours;
		cumulativeAt[tier] = cumulative;
		bannersEarned += hours * bannersPerHour;

		console.log(
			`T${tier}`.padEnd(6) +
				bonesPerHour.toExponential(2).padStart(10) +
				bannersPerHour.toFixed(0).padStart(11) +
				cost.toExponential(2).padStart(12) +
				`${hours.toFixed(1)}h`.padStart(8) +
				`${cumulative.toFixed(1)}h`.padStart(12),
		);
	}

	console.log("");
	for (const tier of [1, 2, 3, 4]) {
		check(
			`T${tier} complete within ${TARGET_HOURS[tier]}h of play`,
			cumulativeAt[tier] <= TARGET_HOURS[tier],
			`${cumulativeAt[tier].toFixed(1)}h`,
		);
	}

	// The finite board has to be affordable, or the last capstones are scenery.
	const treeCost = UPGRADE_NODES.filter((n) => !n.repeatGrowth).reduce(
		(s, n) => s + (n.cost.banners ?? 0),
		0,
	);
	check(
		"the upgrade tree is affordable across a run",
		bannersEarned >= treeCost,
		`${Math.round(bannersEarned)} earned vs ${treeCost} to buy`,
	);
	// ...and not so cheap it is done in the opening tiers.
	check(
		"the tree is not finished before tier 4",
		treeCost > bannersEarned * 0.5,
		`${treeCost} of ${Math.round(bannersEarned)}`,
	);
}

function tierFilter(): number | null {
	const argv =
		(globalThis as { process?: { argv?: string[] } }).process?.argv ?? [];
	const n = Number(argv[2]);
	return n >= 1 && n <= 4 ? n : null;
}

function main(): void {
	const only = tierFilter();
	const DEFS = Object.values(DUNGEON_DEFS).filter(
		(d) => only === null || d.tier === only,
	);
	console.log(only === null ? "\nAll tiers\n" : `\nTier ${only} only\n`);
	console.log("\n1. Thresholds per dungeon\n");
	console.log(
		`${"dungeon".padEnd(22)}${"T".padStart(2)}${"power".padStart(10)}` +
			`${"WIN".padStart(6)}${"AUTO".padStart(6)}${"band".padStart(7)}` +
			`${"fight".padStart(8)}${"swing/HP".padStart(10)}`,
	);

	const rows: {
		def: DungeonDef;
		t: Thresholds;
		swingRatio: number;
	}[] = [];

	const indexInTier = new Map<string, number>();
	{
		const seen: Record<number, number> = {};
		for (const d of Object.values(DUNGEON_DEFS)) {
			seen[d.tier] = (seen[d.tier] ?? 0) + 1;
			indexInTier.set(d.id, seen[d.tier] - 1);
		}
	}

	for (const def of DEFS) {
		const state = makeState(buildFor(def.tier, indexInTier.get(def.id) ?? 0));
		// A threshold above the build's squad limit is unfieldable.
		const t = thresholds(def, state, state.derived.maxSquadSize);
		const unitHp = effectiveUnitStats(state.derived, "skeleton").hp;
		const swingRatio = worstEnemySwing(def, state) / unitHp;
		rows.push({ def, t, swingRatio });

		const band =
			t.win !== null && t.auto !== null
				? `${((t.auto / t.win - 1) * 100).toFixed(0)}%`
				: "—";
		console.log(
			def.name.padEnd(22) +
				String(def.tier).padStart(2) +
				enemyPower(def).toExponential(1).padStart(10) +
				(t.win === null ? ">cap" : String(t.win)).padStart(6) +
				(t.auto === null ? ">cap" : String(t.auto)).padStart(6) +
				band.padStart(7) +
				(t.durationSec > 0 ? `${t.durationSec.toFixed(0)}s` : "—").padStart(8) +
				`${(swingRatio * 100).toFixed(0)}%`.padStart(10),
		);
	}

	console.log("\n2. The opening fight falls to the squad you are given");
	{
		// The literal starting state. If this fails the game cannot be started.
		const fresh = makeState({ purchased: [], w: 0, crypt: 0 });
		const opener = DUNGEON_DEFS[STARTING_DUNGEON_ID];
		const a = sweep(comp(BASE_MAX_SQUAD_SIZE), opener, fresh, 9);
		check(
			`${opener.name} clears with ${BASE_MAX_SQUAD_SIZE} level-zero skeletons`,
			a.winRate >= 0.9,
			`${(a.winRate * 100).toFixed(0)}% win rate`,
		);
		check(
			`${opener.name} costs losses at that size`,
			a.mortalLost > 0.2,
			`${a.mortalLost.toFixed(1)} lost per clear`,
		);
	}

	console.log("\n2b. Every dungeon is reachable at its tier's build");
	for (const { def, t } of rows) {
		check(
			`${def.name} — automatable`,
			t.auto !== null,
			t.win === null ? "never wins" : "wins but never runs clean",
		);
	}

	console.log("\n3. The ladder climbs");
	{
		const reached = rows.filter((r) => r.t.auto !== null);
		let monotone = true;
		let detail = "";
		for (let i = 1; i < reached.length; i++) {
			const prev = reached[i - 1];
			const cur = reached[i];
			// Only compare inside a tier; across tiers the build changes too.
			if (prev.def.tier !== cur.def.tier) continue;
			if ((cur.t.auto ?? 0) < (prev.t.auto ?? 0)) {
				monotone = false;
				detail = `${prev.def.name} ${prev.t.auto} → ${cur.def.name} ${cur.t.auto}`;
			}
		}
		// Non-decreasing: small squads tie at whole-unit resolution.
		check("no dungeon in a tier is easier than the last", monotone, detail);

		for (const tier of [1, 2, 3, 4]) {
			const inTier = rows.filter(
				(r) => r.def.tier === tier && r.t.auto !== null,
			);
			if (inTier.length < 2) continue;
			const first = inTier[0].t.auto ?? 1;
			const last = inTier[inTier.length - 1].t.auto ?? 1;
			// ×1.8 power per dungeon, squad as its square root: ×2.4 across a tier.
			const ramp = last / first;
			check(
				`T${tier} ramps across the tier`,
				ramp >= 1.75,
				`${first} → ${last} (${ramp.toFixed(1)}×)`,
			);
		}
	}

	console.log("\n4. The attrition band stays open");
	for (const { def, t } of rows) {
		if (t.win === null || t.auto === null) continue;
		if (t.win < BAND_MIN_SQUAD) continue;
		check(
			`${def.name} — beating it isn't instantly free`,
			t.auto > t.win,
			`WIN and AUTO both ${t.win}`,
		);
	}

	console.log("\n5. No enemy one-shots a unit of its tier");
	for (const { def, swingRatio } of rows) {
		check(
			`${def.name} — worst blow is ${(swingRatio * 100).toFixed(0)}% of unit HP`,
			swingRatio <= ONE_SHOT_LIMIT,
			`limit ${ONE_SHOT_LIMIT * 100}%`,
		);
	}

	console.log("\n6. Fights read as encounters");
	for (const { def, t } of rows) {
		if (t.auto === null) continue;
		check(
			`${def.name} — ${t.durationSec.toFixed(0)}s`,
			t.durationSec >= 10 && t.durationSec <= 120,
			"want 10–120s",
		);
	}

	reportSquadExponent();
	reportPacing();

	if (failures > 0) {
		throw new Error(`${failures} balance check(s) FAILED`);
	}
	console.log("\nAll balance checks passed.\n");
}

main();
