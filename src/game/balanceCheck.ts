/**
 * Balance calibration harness — whether the numbers in `data/` produce the game
 * they are meant to. Run: `bunx tsx src/game/balanceCheck.ts`, optionally with a
 * tier number. It drives the real `CombatEngine` through the real
 * `recomputeDerived`, so what it measures is what a player meets.
 *
 * Two thresholds per dungeon, and the gap between them is the design surface:
 *
 * - **WIN** — the smallest squad that clears reliably.
 * - **AUTO** — the smallest squad that clears without losing a *mortal* unit,
 *   so it runs unattended forever. Undying losses are free and not counted.
 *
 * Thresholds that coincide make a dungeon binary; a wide gap is the stretch a
 * player earns automation across.
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

// ── Building a necromancer ───────────────────────────────────

type Comp = Record<UnitType, number>;

/** An all-skeleton squad — the reference composition every threshold uses. */
export function comp(skeleton: number, zombie = 0, wraith = 0): Comp {
	return { skeleton, zombie, wraith };
}

const mortalSize = (c: Comp) =>
	UNIT_TYPES.filter((t) => !UNDYING_TYPES.has(t)).reduce((n, t) => n + c[t], 0);

interface Build {
	/** Upgrade node ids owned. Defaults to the whole tree. */
	purchased?: string[];
	/** Level of every unit stat track. */
	w?: number;
	/** Crypt squad-size level — what actually caps the squad. */
	crypt?: number;
}

function makeState({ purchased, w = 0, crypt = 0 }: Build): GameState {
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

// ── One fight ────────────────────────────────────────────────

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
	// Mirrors `compositionAfterFight`: the undying reform at full pre-fight
	// strength whatever happened, so only the mortals can actually be lost.
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

// ── Thresholds ───────────────────────────────────────────────

interface Thresholds {
	win: number | null;
	auto: number | null;
	/** Fight length in sim-seconds at the AUTO squad, the steady-state case. */
	durationSec: number;
}

/**
 * Smallest squad clearing `>=90%`, then smallest clearing losslessly. Probed
 * geometrically and bisected rather than scanned — a fight is expensive, and
 * the curve is monotone enough that bisection lands within a unit or two.
 */
function thresholds(
	def: DungeonDef,
	state: GameState,
	cap: number,
): Thresholds {
	// Five seeds lands a threshold within a unit or two — finer than the numbers
	// being tuned. Big fights get three: a fight's outcome is an average over
	// every unit in it, so variance falls as the armies grow, and five would put
	// a Tier 4 sweep out of reach for iterating.
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

	// AUTO is not reliably monotone at single-unit resolution, so this walks up
	// geometrically rather than bisecting a predicate that can flicker.
	for (let n = win; n <= cap; n = Math.max(n + 1, Math.ceil(n * 1.12))) {
		const a = sweep(comp(n), def, state, seedsFor(n));
		if (a.winRate >= 0.9 && a.mortalLost < 0.5) {
			return { win, auto: n, durationSec: a.durationSec };
		}
	}
	return { win, auto: null, durationSec: 0 };
}

// ── The elite one-shot invariant ─────────────────────────────

/**
 * With discrete swings an enemy's blow is `dmg × interval` in one go. A dungeon
 * where that exceeds a good fraction of a player unit's HP can never be
 * automated — it deletes a unit per blow however large the squad — which breaks
 * the clear-it-by-hand-then-automate arc every dungeon is supposed to have.
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

// ── Report ───────────────────────────────────────────────────

/** Enemy power as the ladder variable: total HP × total DPS — see the plan. */
function enemyPower(def: DungeonDef): number {
	let hp = 0;
	let dps = 0;
	for (const e of def.enemies) {
		hp += e.amount * e.stats.hp;
		dps += e.amount * e.stats.dmg;
	}
	return hp * dps;
}

/**
 * What a player plausibly has on first reaching each tier. Thresholds are
 * meaningless without it — measuring Tier 4 against a naked build reports a wall
 * nobody stands in front of.
 */
const TIER_ENTRY: Record<number, Build> = {
	1: { purchased: ["s1", "s3"], w: 3, crypt: 8 },
	2: { purchased: ["s1", "s2", "s3", "c3", "c4", "s7"], w: 12, crypt: 30 },
	3: { w: 26, crypt: 55 },
	4: { w: 40, crypt: 75 },
	5: { w: 52, crypt: 95 },
};

/**
 * The build at dungeon `index` of `tier`, interpolated between that tier's entry
 * gear and the next tier's, since a player grows *through* a tier.
 *
 * Only a fraction of the way. The full span would model someone who has already
 * earned the next tier's gear, and their growth would cancel the difficulty ramp
 * exactly — which is how every dungeon in a tier ends up feeling the same.
 */
function buildFor(tier: number, index: number): Build {
	const a = TIER_ENTRY[tier];
	const b = TIER_ENTRY[tier + 1];
	const f = index / 8;
	const lerp = (x: number, y: number) => Math.round(x + (y - x) * f);
	return {
		purchased: a.purchased,
		w: lerp(a.w ?? 0, b.w ?? 0),
		crypt: lerp(a.crypt ?? 0, b.crypt ?? 0),
	};
}

/**
 * Below this the two thresholds can't meaningfully separate — a squad of six
 * has no room to be a squad of six-and-a-half — so the band assertion only
 * applies once a dungeon needs a real force.
 */
const BAND_MIN_SQUAD = 8;

const TICKS_PER_HOUR = 3600 * TICKS_PER_SECOND;

/** Measured fight lengths per tier, in ticks — see section 1's `fight` column. */
const FIGHT_TICKS: Record<number, number> = {
	1: 180,
	2: 170,
	3: 210,
	4: 300,
};

// ── What a bigger squad is actually worth ────────────────────

/**
 * Lanchester's square law would make squad size worth double any per-unit stat,
 * but it doesn't hold here: only units in contact can swing, so a rank at the
 * back contributes nothing until someone in front of it dies. The real exponent
 * prices the squad-size track against the stat tracks, so it is measured.
 *
 * Method: hold the build fixed, scale one dungeon's HP and damage together to
 * move its power by a known factor, and see how the required squad responds.
 * If `squad ∝ power^a` then `power ∝ squad^(1/a)`, and `1/a` is the exponent.
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
	// Two scales: crowding is what bends the curve away from the square law, and
	// it bites harder the bigger the armies get.
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
	// Least-squares slope of ln(squad) against ln(power).
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

// ── Pacing ───────────────────────────────────────────────────

/**
 * How long each tier takes, analytically: whether a player can afford the build
 * that beats a dungeon in the time the design intends. No fights are run — it
 * prices the reference builds against the bone income of the tier below.
 *
 * Hours are of *play*, against a semi-active player — four active hours plus one
 * eight-hour offline claim a day, so about twelve simulated hours per calendar
 * day.
 */
const TARGET_HOURS: Record<number, number> = {
	1: 5, // a couple of hours
	2: 26, // 16-24h of calendar time, ~2 days
	3: 80, // a few days
	4: 200, // one to two weeks
};

/** Squads fielded concurrently at each tier — one dungeon each, by the rule. */
const SQUADS_AT: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 5 };

/** Unit tracks a player can spend on: zombies open at s4, wraiths at s9. */
function spendableTracks(tier: number): UnitType[] {
	return UNIT_TYPES.slice(0, Math.min(3, tier)) as UnitType[];
}

function buildCostBones(w: number, crypt: number, tier: number): number {
	let bones = 0;
	for (const unit of spendableTracks(tier)) {
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

function reportPacing(): void {
	console.log("\n7. Pacing — can the build be afforded in time?\n");
	console.log(
		`${"tier".padEnd(6)}${"bones/h".padStart(10)}${"banners/h".padStart(11)}` +
			`${"build cost".padStart(12)}${"hours".padStart(8)}${"cumulative".padStart(12)}`,
	);

	let cumulative = 0;
	let bannersEarned = 0;
	for (const tier of [1, 2, 3, 4]) {
		const defs = Object.values(DUNGEON_DEFS).filter((d) => d.tier === tier);
		let bonesPerHour = 0;
		let bannersPerHour = 0;
		for (const d of defs) {
			// A round trip is out, fight, and back — the dungeon is held for all of it.
			const cycle = 2 * d.travelTimeTicks + FIGHT_TICKS[tier];
			const clears = TICKS_PER_HOUR / cycle;
			const bones =
				((d.lootTable.bonesMin + d.lootTable.bonesMax) / 2) *
				clearMultiplier(500);
			bonesPerHour += clears * bones;
			bannersPerHour += clears * d.tier;
		}
		// Only as many rooms are worked as there are squads to work them.
		const share = SQUADS_AT[tier] / defs.length;
		bonesPerHour *= share;
		bannersPerHour *= share;

		const cost =
			buildCostBones(
				TIER_ENTRY[tier + 1].w ?? 0,
				TIER_ENTRY[tier + 1].crypt ?? 0,
				tier + 1,
			) -
			buildCostBones(
				TIER_ENTRY[tier].w ?? 0,
				TIER_ENTRY[tier].crypt ?? 0,
				tier,
			);
		const hours = cost / bonesPerHour;
		cumulative += hours;
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
	let running = 0;
	for (const tier of [1, 2, 3, 4]) {
		const defs = Object.values(DUNGEON_DEFS).filter((d) => d.tier === tier);
		let bph = 0;
		for (const d of defs) {
			const cycle = 2 * d.travelTimeTicks + FIGHT_TICKS[tier];
			bph +=
				(TICKS_PER_HOUR / cycle) *
				((d.lootTable.bonesMin + d.lootTable.bonesMax) / 2) *
				clearMultiplier(500);
		}
		bph *= SQUADS_AT[tier] / defs.length;
		running +=
			(buildCostBones(
				TIER_ENTRY[tier + 1].w ?? 0,
				TIER_ENTRY[tier + 1].crypt ?? 0,
				tier + 1,
			) -
				buildCostBones(
					TIER_ENTRY[tier].w ?? 0,
					TIER_ENTRY[tier].crypt ?? 0,
					tier,
				)) /
			bph;
		check(
			`T${tier} complete within ${TARGET_HOURS[tier]}h of play`,
			running <= TARGET_HOURS[tier],
			`${running.toFixed(1)}h`,
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
	// ...but not so cheap it is done in the opening tiers.
	check(
		"the tree is not finished before tier 4",
		treeCost > bannersEarned * 0.5,
		`${treeCost} of ${Math.round(bannersEarned)}`,
	);
}

/**
 * Optional tier filter: `balanceCheck.ts 2` measures Tier 2 alone. A full run
 * drives thousands of real fights, so this is the difference between a minute
 * and an afternoon while iterating.
 */
function tierFilter(): number | null {
	// Reached through `globalThis` because the repo carries no node types.
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
		// The build's own squad limit is the cap that matters: a threshold above it
		// is a dungeon the player cannot field enough bodies for.
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
		// The literal starting state rather than a modelled build: no upgrades, no
		// workshop levels, `BASE_MAX_SQUAD_SIZE` bodies. If this fails the game
		// cannot be started at all.
		const fresh = makeState({ purchased: [] });
		const opener = DUNGEON_DEFS[STARTING_DUNGEON_ID];
		const a = sweep(comp(BASE_MAX_SQUAD_SIZE), opener, fresh, 9);
		check(
			`${opener.name} clears with ${BASE_MAX_SQUAD_SIZE} level-zero skeletons`,
			a.winRate >= 0.9,
			`${(a.winRate * 100).toFixed(0)}% win rate`,
		);
		// It should still cost something, or there is nothing to grow out of.
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
			// Only compare inside a tier — across tiers the build changes too.
			if (prev.def.tier !== cur.def.tier) continue;
			if ((cur.t.auto ?? 0) < (prev.t.auto ?? 0)) {
				monotone = false;
				detail = `${prev.def.name} ${prev.t.auto} → ${cur.def.name} ${cur.t.auto}`;
			}
		}
		// Non-decreasing rather than strictly increasing: small squads can tie at a
		// whole number of units, which is resolution rather than flatness. The
		// tier-wide ramp below is what enforces the climb.
		check("no dungeon in a tier is easier than the last", monotone, detail);

		for (const tier of [1, 2, 3, 4]) {
			const inTier = rows.filter(
				(r) => r.def.tier === tier && r.t.auto !== null,
			);
			if (inTier.length < 2) continue;
			const first = inTier[0].t.auto ?? 1;
			const last = inTier[inTier.length - 1].t.auto ?? 1;
			// Power steps ×1.8 per dungeon and required squad goes as its square
			// root, so ×5.8 of power across a tier is ×2.4 of squad. On AUTO rather
			// than WIN: within a tier the climb shows up as what automation costs.
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

	// Analytic and cheap, so it runs even on a tier-filtered invocation.
	reportSquadExponent();
	reportPacing();

	if (failures > 0) {
		throw new Error(`${failures} balance check(s) FAILED`);
	}
	console.log("\nAll balance checks passed.\n");
}

main();
