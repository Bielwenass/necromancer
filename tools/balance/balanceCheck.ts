/**
 * Balance calibration harness. `bunx tsx src/game/balanceCheck.ts [tier]`.
 *
 * Three passes, none of them carrying a reference build. First the engine is
 * probed for what a squad is worth, giving the exponents everything downstream
 * prices with. Then a run is simulated forward from the new-game state on real
 * income and real prices, so the build at any dungeon is the one the economy
 * pays for rather than one written down here. Then the thresholds are measured
 * at those builds: WIN is the smallest squad that clears reliably, AUTO the
 * smallest that clears without losing a mortal unit. The gap is the design
 * surface.
 *
 * A tier argument narrows the report and the exponents measured, not the run:
 * reaching tier 3 still means playing one and two first.
 */

import { COMBAT_CONFIG } from "../../src/combat/config";
import { effectiveUnitStats } from "../../src/combat/dungeonCombat";
import { DUNGEON_DEFS } from "../../src/game/data/dungeons";
import {
	BASE_MAX_SQUAD_SIZE,
	STARTING_DUNGEON_ID,
} from "../../src/game/data/economy";
import { TICKS_PER_SECOND } from "../../src/game/data/pacing";
import { UPGRADE_NODES } from "../../src/game/data/upgrades";
import { RESOURCE_KEYS } from "../../src/game/rules/resources";
import { GARDEN_PLOTS } from "../../src/game/rules/workshop";
import type { DungeonDef, GameState } from "../../src/game/types";
import { comp, fightCount, sweep, type Thresholds, thresholds } from "./fights";
import {
	buildModel,
	enemyPower,
	type Fit,
	measureTier,
	type PowerModel,
	type TierScaling,
} from "./power";
import { type Milestone, type Progression, simulate } from "./progression";
import { newRun } from "./state";

let failures = 0;

function check(name: string, ok: boolean, detail = ""): void {
	if (ok) {
		console.log(`  ok    ${name}`);
	} else {
		failures++;
		console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

const TIERS = [1, 2, 3, 4] as const;

/** Hours of play per tier; a semi-active day is ~12 simulated hours. */
const TARGET_HOURS: Record<number, number> = { 1: 5, 2: 26, 3: 80, 4: 200 };

/**
 * Ceiling on one enemy blow (`dmg × interval`) as a share of a player unit's HP.
 * Above it a dungeon deletes a unit per blow at any squad size.
 */
const ONE_SHOT_LIMIT = 0.25;

/** Below this, WIN and AUTO tie at whole-unit resolution and mean nothing. */
const BAND_MIN_SQUAD = 8;

/** Residual past which the power family stops describing the measured curve. */
const FIT_LIMIT = 0.06;

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

function hours(h: number): string {
	return h >= 100 ? `${h.toFixed(0)}h` : `${h.toFixed(1)}h`;
}

function fitLine(fits: Fit[]): string {
	return fits
		.map(
			(f) => `${f.name} ${Number.isFinite(f.rmse) ? f.rmse.toFixed(3) : "∞"}`,
		)
		.join(", ");
}

function reportPowerModel(tiers: number[]): PowerModel {
	console.log("\n1. What a squad is worth\n");
	const scalings: TierScaling[] = [];

	for (const tier of tiers) {
		const defs = Object.values(DUNGEON_DEFS).filter((d) => d.tier === tier);
		const s = measureTier(tier, defs);
		if (!s) {
			check(`T${tier}: the reference dungeon can be probed`, false);
			continue;
		}
		scalings.push(s);

		console.log(
			`  ${s.def.name} (T${tier}), ${s.probeSquad} units at ×${s.probeMult.toFixed(2)} stats`,
		);
		console.log(
			`    power  ${s.powerPoints.map((p) => `×${p.x}→${p.n}`).join("  ")}`,
		);
		console.log(
			`    stats  ${s.statPoints.map((p) => `×${p.x}→${p.n}`).join("  ")}`,
		);
		console.log(`    fit    ${fitLine(s.powerFits)}`);
		console.log(
			`    ⇒ power ∝ squad^${s.alpha.toFixed(2)} × (hp·dmg)^${s.beta.toFixed(2)}\n`,
		);

		const power = s.powerFits.find((f) => f.name === "power") as Fit;
		check(
			`T${tier}: the curve is a power law`,
			power.rmse <= FIT_LIMIT,
			`residual ${power.rmse.toFixed(3)}, best fit ${s.powerFits[0].name}`,
		);
		check(
			`T${tier}: a bigger squad pays more than linearly`,
			s.alpha > 1.15,
			`squad^${s.alpha.toFixed(2)}`,
		);
		check(
			`T${tier}: squad size is not worth more than the square law`,
			s.alpha <= 2.15,
			`squad^${s.alpha.toFixed(2)} — above 2 the crypt track is underpriced`,
		);
	}

	if (scalings.length === 0) throw new Error("no tier could be probed");
	const model = buildModel(scalings);
	const spread =
		Math.max(...scalings.map((s) => s.alpha)) -
		Math.min(...scalings.map((s) => s.alpha));
	console.log(
		model.universal
			? `  one exponent covers every tier: squad^${model.alpha(1).toFixed(2)} (spread ${spread.toFixed(2)})`
			: `  tiers disagree by ${spread.toFixed(2)}, so each is priced at its own exponent`,
	);
	return model;
}

function buildOf(m: Milestone): string {
	const ws = m.state.workshop;
	return (
		String(m.squad).padStart(6) +
		String(ws.skeleton.hp).padStart(5) +
		String(ws.skeleton.dmg).padStart(5) +
		String(ws.crypt.squadSize).padStart(7) +
		String(m.squads).padStart(8)
	);
}

function reportRun(run: Progression, defs: DungeonDef[]): void {
	console.log("\n2. The run\n");
	console.log(
		`${"dungeon".padEnd(22)}${"T".padStart(2)}${"wins".padStart(8)}` +
			`${"clean".padStart(8)}${"squad".padStart(6)}${"hp".padStart(5)}` +
			`${"dmg".padStart(5)}${"crypt".padStart(7)}${"circles".padStart(8)}` +
			`${"bones/h".padStart(10)}`,
	);

	for (const def of defs) {
		const m = run.milestones.get(def.id);
		const farmed = run.farmedAt.get(def.id);
		console.log(
			def.name.padEnd(22) +
				String(def.tier).padStart(2) +
				(farmed === undefined ? "never" : hours(farmed)).padStart(8) +
				(m ? hours(m.hours) : "never").padStart(8) +
				(m ? buildOf(m) : "—".padStart(31)) +
				(m ? m.bonesPerHour.toExponential(1) : "—").padStart(10),
		);
	}

	const spent = [...run.spend.entries()].sort((a, b) => b[1] - a[1]);
	const total = spent.reduce((s, [, v]) => s + v, 0);
	console.log(
		`\n  bones spent: ${spent
			.map(([k, v]) => `${k} ${((v / total) * 100).toFixed(0)}%`)
			.join(", ")}`,
	);
	console.log(
		`  circles: ${run.squads.map((s) => `${s.size} on ${s.name}`).join(", ")}`,
	);
	const garden = run.final.workshop.garden;
	console.log(
		`  garden: ${GARDEN_PLOTS.map((p) => `${p.id} ${garden[p.id]}`).join(", ")}` +
			`, worth ${(run.final.derived.bonesPerTick * TICKS_PER_SECOND * 3600).toExponential(1)} bones/h`,
	);
	// What the run banked and never found a use for; a dead currency shows here.
	const left = run.final.resources;
	console.log(
		`  unspent: ${RESOURCE_KEYS.filter((k) => left[k] >= 1)
			.map((k) => `${k} ${left[k].toExponential(1)}`)
			.join(", ")}`,
	);
	console.log(
		`  ${hours(run.hours)} of play, ${hours(run.underwater)} of it farming at a loss, ` +
			`${Math.round(run.bannersEarned)} banners earned` +
			(run.stall ? `, stalled: ${run.stall}` : ""),
	);

	console.log("");
	check("the run reaches every dungeon", run.stall === null, run.stall ?? "");
	const share = run.bailout / Math.max(1, run.bailout + run.earned);
	check(
		"the run pays for its own dead",
		run.bailout <= 0,
		`${run.bailout.toExponential(1)} bones bailed out, ${(share * 100).toFixed(1)}% of what it spent`,
	);
	for (const def of defs) {
		check(
			`${def.name} — runs clean`,
			run.milestones.has(def.id),
			run.farmedAt.has(def.id) ? "wins but never runs clean" : "never wins",
		);
	}
}

function reportPacing(run: Progression, tiers: number[]): void {
	console.log("\n3. Pacing\n");
	for (const tier of tiers) {
		const inTier = Object.values(DUNGEON_DEFS).filter((d) => d.tier === tier);
		const done = inTier.map((d) => run.milestones.get(d.id)?.hours);
		if (done.some((h) => h === undefined)) continue;
		const at = Math.max(...(done as number[]));
		check(
			`T${tier} complete within ${TARGET_HOURS[tier]}h of play`,
			at <= TARGET_HOURS[tier],
			hours(at),
		);
	}

	// The board is bought over a whole run, so a narrowed one cannot price it.
	if (tiers.includes(4)) {
		const treeCost = UPGRADE_NODES.filter((n) => !n.repeatGrowth).reduce(
			(s, n) => s + (n.cost.banners ?? 0),
			0,
		);
		check(
			"the upgrade tree is affordable across a run",
			run.bannersEarned >= treeCost,
			`${Math.round(run.bannersEarned)} earned vs ${treeCost} to buy`,
		);
		const tier4 = Object.values(DUNGEON_DEFS)
			.filter((d) => d.tier === 4)
			.map((d) => run.farmedAt.get(d.id) ?? Number.POSITIVE_INFINITY);
		const opened = Math.min(...tier4);
		check(
			"the tree is not finished before tier 4",
			run.treeDoneHours !== null && run.treeDoneHours >= opened,
			run.treeDoneHours === null
				? "never finished"
				: `done at ${hours(run.treeDoneHours)}, tier 4 opens at ${hours(opened)}`,
		);
	}
}

interface Row {
	def: DungeonDef;
	t: Thresholds;
	swingRatio: number;
	need: number;
}

function reportThresholds(
	run: Progression,
	defs: DungeonDef[],
	model: PowerModel,
): Row[] {
	console.log("\n4. Thresholds at the build the run had\n");
	console.log(
		`${"dungeon".padEnd(22)}${"T".padStart(2)}${"power".padStart(10)}` +
			`${"WIN".padStart(6)}${"AUTO".padStart(6)}${"band".padStart(7)}` +
			`${"need".padStart(10)}${"fight".padStart(8)}${"swing/HP".padStart(10)}`,
	);

	const rows: Row[] = [];
	for (const def of defs) {
		const m = run.milestones.get(def.id);
		if (!m) continue;
		const t = thresholds(def, m.state, { cap: m.squad, hint: m.squad });
		const unitHp = effectiveUnitStats(m.state.derived, "skeleton").hp;
		const need = model.power(m.state, t.auto ?? m.squad, def.tier);
		const row = {
			def,
			t,
			swingRatio: worstEnemySwing(def, m.state) / unitHp,
			need,
		};
		rows.push(row);

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
				need.toExponential(1).padStart(10) +
				(t.durationSec > 0 ? `${t.durationSec.toFixed(0)}s` : "—").padStart(8) +
				`${(row.swingRatio * 100).toFixed(0)}%`.padStart(10),
		);
	}
	return rows;
}

function reportLadder(rows: Row[], tiers: number[]): void {
	console.log("\n5. The ladder climbs");
	let monotone = true;
	let detail = "";
	for (let i = 1; i < rows.length; i++) {
		const prev = rows[i - 1];
		const cur = rows[i];
		if (prev.def.tier !== cur.def.tier) continue;
		if (cur.need < prev.need) {
			monotone = false;
			detail = `${prev.def.name} → ${cur.def.name}`;
		}
	}
	// Requirements are in power units, so builds growing under them cancel out.
	check("no dungeon in a tier asks less than the last", monotone, detail);

	for (const tier of tiers) {
		const inTier = rows.filter((r) => r.def.tier === tier);
		if (inTier.length < 2) continue;
		const first = inTier[0];
		const last = inTier[inTier.length - 1];
		const ramp = last.need / first.need;
		const powerRamp = enemyPower(last.def) / enemyPower(first.def);
		check(
			`T${tier} ramps across the tier`,
			ramp >= 2,
			`asks ${ramp.toFixed(1)}× more across a ${powerRamp.toFixed(1)}× power span`,
		);
	}
}

function reportFights(rows: Row[]): void {
	console.log("\n6. The opening fight falls to the squad you are given");
	{
		const fresh = newRun();
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

	console.log("\n7. The attrition band stays open");
	for (const { def, t } of rows) {
		if (t.win === null || t.auto === null) continue;
		if (t.win < BAND_MIN_SQUAD) continue;
		check(
			`${def.name} — beating it isn't instantly free`,
			t.auto > t.win,
			`WIN and AUTO both ${t.win}`,
		);
	}

	console.log("\n8. No enemy one-shots a unit of its tier");
	for (const { def, swingRatio } of rows) {
		check(
			`${def.name} — worst blow is ${(swingRatio * 100).toFixed(0)}% of unit HP`,
			swingRatio <= ONE_SHOT_LIMIT,
			`limit ${ONE_SHOT_LIMIT * 100}%`,
		);
	}

	console.log("\n9. Fights read as encounters");
	for (const { def, t } of rows) {
		if (t.auto === null) continue;
		check(
			`${def.name} — ${t.durationSec.toFixed(0)}s`,
			t.durationSec >= 10 && t.durationSec <= 120,
			"want 10–120s",
		);
	}
}

function tierFilter(): number | null {
	const argv =
		(globalThis as { process?: { argv?: string[] } }).process?.argv ?? [];
	const n = Number(argv[2]);
	return n >= 1 && n <= 4 ? n : null;
}

function main(): void {
	const started = Date.now();
	const only = tierFilter();
	const maxTier = only ?? 4;
	const tiers = TIERS.filter((t) => t <= maxTier);
	const defs = Object.values(DUNGEON_DEFS).filter(
		(d) => only === null || d.tier === only,
	);
	console.log(only === null ? "\nAll tiers\n" : `\nTier ${only} only\n`);

	const model = reportPowerModel(tiers);
	const run = simulate(model, maxTier);
	reportRun(run, defs);
	reportPacing(run, tiers);
	const rows = reportThresholds(run, defs, model);
	reportLadder(rows, tiers);
	reportFights(rows);

	console.log(
		`\n${fightCount()} fights in ${((Date.now() - started) / 1000).toFixed(0)}s`,
	);
	if (failures > 0) {
		throw new Error(`${failures} balance check(s) FAILED`);
	}
	console.log("\nAll balance checks passed.\n");
}

main();
