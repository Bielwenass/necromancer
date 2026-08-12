/**
 * Online/offline parity harness.
 *
 * Run: `bunx tsx src/game/parityCheck.ts`
 *
 * The live tick (`tick.ts` + `slices/squadSlice.ts`) and the offline catchup
 * (`catchupOffline.ts`) simulate the same game two different ways — 100ms steps
 * versus jumps between events on a min-heap. They share their rules through
 * `rules/loot.ts` and `rules/fight.ts` but not their *sequencing*, and nothing
 * else in the repo checks that the two agree.
 *
 * What this can and can't assert: the live path rolls loot and fight seeds from
 * `Math.random` on purpose, while catchup seeds everything so a mid-window
 * refresh reproduces itself. Identical resource totals are therefore not a
 * property either path guarantees. What must hold is the structure — the same
 * state machine, the same payout arithmetic, the same unlock rules — so that is
 * what is checked, alongside catchup's own determinism contract.
 */

import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { mulberry32 } from "../combat/prng";
import { simulateOffline } from "./catchupOffline";
import { DUNGEON_DEFS } from "./data/dungeons";
import { ENGINE_DT, TICK_MS, TICKS_PER_DAY } from "./data/pacing";
import { recomputeDerived } from "./rules/derived";
import { resolveFightOutcome } from "./rules/fight";
import { accrueFreePulls } from "./rules/gacha";
import { generateLoot, projectLoot } from "./rules/loot";
import { checkUnlockConditions, makeDungeonState } from "./rules/unlocks";
import { gameTick } from "./tick";
import type { DungeonState, GameState } from "./types";

let failures = 0;

function check(name: string, ok: boolean, detail = ""): void {
	if (ok) {
		console.log(`  ok    ${name}`);
	} else {
		failures++;
		console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

// ── Scenario ─────────────────────────────────────────────────

/**
 * A necromancer strong enough to clear the opening dungeon without losses, with
 * auto-deploy on so the squad cycles through travel → fight → return → travel
 * for the whole window. That cycle is what exercises every event kind.
 */
function buildScenario(dispatched: boolean): GameState {
	const base: Omit<GameState, "derived"> = {
		resources: {
			bones: 1000,
			souls: 0,
			dust: 0,
			corpses: 0,
			banners: 0,
		},
		units: { skeletons: 40, zombies: 0, wraiths: 0 },
		squads: [
			{
				id: "S-01",
				name: "Parity",
				composition: { skeleton: 30, zombie: 0, wraith: 0 },
				roster: { skeleton: 30, zombie: 0, wraith: 0 },
				targetDungeonId: dispatched ? "paupers-tomb" : null,
				state: dispatched ? ("traveling" as const) : ("idle" as const),
				position: 0,
				pendingLoot: null,
			},
		],
		dungeons: Object.values(DUNGEON_DEFS).map((def) =>
			makeDungeonState(def, def.id === "paupers-tomb"),
		),
		relics: { inventory: [], equipped: {} },
		// c1 = auto-deploy, s1/s5 = squad size and count, n2/n5 = the corpse and
		// soul gates, n4/n7 = the yield and soul-chance amplifiers. Both gates are
		// bought so the loot path under test is the full one, with every resource
		// in play.
		upgrades: {
			purchased: [
				"c1",
				"c2",
				"s1",
				"s2",
				"s3",
				"s5",
				"n1",
				"n2",
				"n4",
				"n5",
				"n7",
			],
		},
		gacha: {
			pityCounters: { banner: 0, carrion: 0, forbidden: 0 },
			lastPulledRelics: null,
			freePulls: 0,
			freePullTicks: 0,
		},
		workshop: {
			skeleton: { hp: 12, dmg: 12, speed: 4 },
			zombie: { hp: 0, dmg: 0, speed: 0 },
			wraith: { hp: 0, dmg: 0, speed: 0 },
			crypt: { squadSize: 5, travelSpeed: 2 },
			garden: { bones: 3, souls: 1, dust: 0, corpses: 2 },
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: 0 },
	};
	return { ...base, derived: recomputeDerived(base as GameState) };
}

/**
 * The live loop, headless: exactly what `useGameLifecycle` runs each interval,
 * minus React. Fights are decided by the same engine the player watches.
 */
function runLive(start: GameState, ticks: number): GameState {
	let state = start;
	const engines = new Map<string, CombatEngine>();

	for (let i = 0; i < ticks; i++) {
		state = { ...state, ...gameTick(state) };

		for (const squad of state.squads) {
			if (
				squad.state !== "fighting" ||
				squad.fightSeed === undefined ||
				!squad.targetDungeonId ||
				engines.has(squad.id)
			) {
				continue;
			}
			const def = DUNGEON_DEFS[squad.targetDungeonId];
			if (!def) continue;
			const engine = new CombatEngine({
				width: COMBAT_W,
				height: COMBAT_H,
				seed: squad.fightSeed,
			});
			engine.setSide(
				"a",
				buildAttackerConfig(squad.composition, state.derived),
			);
			engine.setSide("b", buildDefenderConfig(def, state.derived));
			engine.start();
			engines.set(squad.id, engine);
		}

		const simMs = TICK_MS * state.derived.combatSpeedMultiplier;
		for (const [squadId, engine] of engines) {
			let remaining = simMs;
			while (remaining >= ENGINE_DT && engine.getWinner() === null) {
				engine.tick(ENGINE_DT);
				remaining -= ENGINE_DT;
			}
			if (remaining > 0 && engine.getWinner() === null) engine.tick(remaining);

			const winner = engine.getWinner();
			if (winner === null) continue;
			engines.delete(squadId);
			state = applyLiveFight(state, squadId, winner, engine.getCounts().a);
		}
	}
	return state;
}

/** `squadSlice.resolveFight`, applied to a plain state rather than the store. */
function applyLiveFight(
	state: GameState,
	squadId: string,
	winner: "a" | "b" | "draw",
	survivorsByType: Record<string, number>,
): GameState {
	const squad = state.squads.find((s) => s.id === squadId);
	if (squad?.state !== "fighting" || !squad.targetDungeonId) return state;
	const ds = state.dungeons.find((d) => d.id === squad.targetDungeonId);
	const def = DUNGEON_DEFS[squad.targetDungeonId];
	if (!ds || !def) return state;

	const res = resolveFightOutcome(
		squad.composition,
		def,
		ds.clearCount,
		{ winner, survivorsByType },
		state.derived,
	);

	if (res.kind === "destroyed") {
		return { ...state, squads: state.squads.filter((s) => s.id !== squadId) };
	}

	return {
		...state,
		resources: {
			...state.resources,
			banners: state.resources.banners + res.bannersAwarded,
		},
		squads: state.squads.map((s) =>
			s.id === squadId
				? {
						...s,
						state: "returning" as const,
						position: 1,
						composition: res.composition,
						pendingLoot: res.loot,
						manualRecall: res.suppressAutoDeploy,
					}
				: s,
		),
		dungeons: state.dungeons.map((d) =>
			d.id === ds.id
				? { ...d, clearCount: d.clearCount + res.clearCountDelta }
				: d,
		),
	};
}

const clearsOf = (dungeons: DungeonState[]) =>
	Object.fromEntries(dungeons.map((d) => [d.id, d.clearCount]));
const unlockedOf = (dungeons: DungeonState[]) =>
	dungeons
		.filter((d) => d.unlocked)
		.map((d) => d.id)
		.sort();
const totalClears = (dungeons: DungeonState[]) =>
	dungeons.reduce((n, d) => n + d.clearCount, 0);
const bannersEarned = (dungeons: DungeonState[]) =>
	dungeons.reduce((n, d) => n + d.clearCount * DUNGEON_DEFS[d.id].tier, 0);

// ── Checks ───────────────────────────────────────────────────

async function main(): Promise<void> {
	const WINDOW = 4000; // ticks — several full dispatch cycles

	console.log("\n1. Catchup is deterministic");
	{
		const a = await simulateOffline(buildScenario(true), WINDOW * TICK_MS);
		const b = await simulateOffline(buildScenario(true), WINDOW * TICK_MS);
		check(
			"same state from the same input",
			JSON.stringify(a) === JSON.stringify(b),
		);
		check("the window did something", totalClears(a.dungeons) > 0, "no clears");
	}

	console.log("\n2. Idle window: live and offline agree exactly");
	{
		// No fights means no randomness on either side, so passive income, day
		// count and the unlock sweep must land on identical numbers.
		const live = runLive(buildScenario(false), WINDOW);
		const off = await simulateOffline(buildScenario(false), WINDOW * TICK_MS);
		const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
		check(
			"bones",
			near(live.resources.bones, off.resources.bones),
			`${live.resources.bones} vs ${off.resources.bones}`,
		);
		check("souls", near(live.resources.souls, off.resources.souls));
		check("corpses", near(live.resources.corpses, off.resources.corpses));
		check(
			"tickCount",
			live.meta.tickCount === off.meta.tickCount,
			`${live.meta.tickCount} vs ${off.meta.tickCount}`,
		);
		check("dayCount", live.meta.dayCount === off.meta.dayCount);
		check(
			"dayCount matches TICKS_PER_DAY",
			live.meta.dayCount === Math.floor(live.meta.tickCount / TICKS_PER_DAY),
		);
		check("squad still idle", live.squads[0].state === off.squads[0].state);
	}

	console.log("\n3. Fight window: same structure, same payout arithmetic");
	{
		const live = runLive(buildScenario(true), WINDOW);
		const off = await simulateOffline(buildScenario(true), WINDOW * TICK_MS);

		check("live squad survived", live.squads.length === 1);
		check("offline squad survived", off.squads.length === 1);
		check(
			"both cleared the dungeon",
			totalClears(live.dungeons) > 0 && totalClears(off.dungeons) > 0,
			`live ${totalClears(live.dungeons)}, offline ${totalClears(off.dungeons)}`,
		);
		// Fight *durations* differ (live seeds are random, catchup's are derived),
		// so the clear counts drift apart slowly. A wide band still catches a
		// sequencing bug, which shows up as one side stalling entirely.
		const lc = totalClears(live.dungeons);
		const oc = totalClears(off.dungeons);
		check(
			"clear counts are within 25%",
			Math.abs(lc - oc) <= Math.max(2, Math.ceil(Math.max(lc, oc) * 0.25)),
			`live ${lc}, offline ${oc}`,
		);
		check(
			"banners = Σ tier × clears (live)",
			live.resources.banners === bannersEarned(live.dungeons),
			`${live.resources.banners} vs ${bannersEarned(live.dungeons)}`,
		);
		check(
			"banners = Σ tier × clears (offline)",
			off.resources.banners === bannersEarned(off.dungeons),
			`${off.resources.banners} vs ${bannersEarned(off.dungeons)}`,
		);
		check(
			"unlocks agree with clears (live)",
			JSON.stringify(unlockedOf(checkUnlockConditions(live.dungeons))) ===
				JSON.stringify(unlockedOf(live.dungeons)),
		);
		check(
			"unlocks agree with clears (offline)",
			JSON.stringify(unlockedOf(checkUnlockConditions(off.dungeons))) ===
				JSON.stringify(unlockedOf(off.dungeons)),
		);
		// Equal clears must imply an equal unlock set — the rule is pure.
		if (
			JSON.stringify(clearsOf(live.dungeons)) ===
			JSON.stringify(clearsOf(off.dungeons))
		) {
			check(
				"equal clears ⇒ equal unlocks",
				JSON.stringify(unlockedOf(live.dungeons)) ===
					JSON.stringify(unlockedOf(off.dungeons)),
			);
		}
	}

	console.log("\n4. The shared fight rule itself");
	{
		const def = DUNGEON_DEFS["paupers-tomb"];
		const derived = buildScenario(false).derived;
		const before = { skeleton: 10, zombie: 2, wraith: 3 };
		const win = {
			winner: "a" as const,
			survivorsByType: { skeleton: 7, zombie: 1 },
		};

		const a = resolveFightOutcome(before, def, 4, win, derived, mulberry32(99));
		const b = resolveFightOutcome(before, def, 4, win, derived, mulberry32(99));
		check("seeded rolls reproduce", JSON.stringify(a) === JSON.stringify(b));
		check("a clear pays banners", a.bannersAwarded === def.tier);
		check("a clear counts", a.clearCountDelta === 1);
		check("wraiths reform on a clear", a.composition.wraith === before.wraith);
		check("losses stick", a.composition.skeleton === 7);

		const wipe = resolveFightOutcome(
			before,
			def,
			4,
			{ winner: "b", survivorsByType: {} },
			derived,
			mulberry32(99),
		);
		check(
			"a wipe pays nothing",
			wipe.loot === null && wipe.bannersAwarded === 0,
		);
		check("a wipe doesn't count as a clear", wipe.clearCountDelta === 0);
		check(
			"a wipe leaves only the undying",
			wipe.composition.wraith === 3 && wipe.composition.skeleton === 0,
		);
		check("a wipe suppresses auto-deploy", wipe.suppressAutoDeploy);

		const total = resolveFightOutcome(
			{ skeleton: 5, zombie: 0, wraith: 0 },
			def,
			0,
			{ winner: "b", survivorsByType: {} },
			derived,
			mulberry32(1),
		);
		check(
			"a wipe with nothing undying destroys the squad",
			total.kind === "destroyed",
		);
	}

	console.log("\n5. Gated economies and the rules layered on top of them");
	{
		const def = DUNGEON_DEFS["paupers-tomb"];
		const open = buildScenario(false).derived;
		// A necromancer who has bought nothing: both economies still shut.
		const shut = recomputeDerived({
			...buildScenario(false),
			upgrades: { purchased: [] },
		});
		check("corpses start locked", !shut.corpsesUnlocked);
		check("souls start locked", !shut.soulsUnlocked);

		const lockedLoot = generateLoot(def.id, 3, shut, mulberry32(7));
		check("a locked clear drops no corpses", (lockedLoot.corpses ?? 0) === 0);
		check("a locked clear drops no souls", (lockedLoot.souls ?? 0) === 0);
		check("a locked clear still drops bones", (lockedLoot.bones ?? 0) > 0);
		check("the projection agrees", projectLoot(def, 3, shut).corpses === 0);

		// Over many clears an opened economy must actually pay out, or the gate
		// would be indistinguishable from a permanent lock.
		let corpses = 0;
		const rand = mulberry32(11);
		for (let i = 0; i < 200; i++) {
			corpses += generateLoot(def.id, 3, open, rand).corpses ?? 0;
		}
		check("an opened economy pays corpses", corpses > 0, `${corpses} in 200`);

		// Reanimation is capped by the squad's size limit, however much it rolls.
		const greedy = { ...open, reanimateChance: 1, maxSquadSize: 12 };
		const res = resolveFightOutcome(
			{ skeleton: 20, zombie: 0, wraith: 0 },
			def,
			0,
			{ winner: "a", survivorsByType: { skeleton: 8 } },
			greedy,
			mulberry32(3),
		);
		check(
			"reanimation never exceeds max squad size",
			res.composition.skeleton === 12,
			`${res.composition.skeleton}`,
		);

		// The Phylactery must pay the same whether the ticks arrive one at a time
		// or all at once — that equality is what lets catchup batch it.
		const start = { freePulls: 0, freePullTicks: 0 };
		let stepwise = start;
		for (let i = 0; i < 2500; i++) {
			stepwise = accrueFreePulls(stepwise, true, 1);
		}
		const batched = accrueFreePulls(start, true, 2500);
		check(
			"free pulls accrue identically stepwise and batched",
			JSON.stringify(stepwise) === JSON.stringify(batched),
			`${JSON.stringify(stepwise)} vs ${JSON.stringify(batched)}`,
		);
		check(
			"the Phylactery pays nothing while unbought",
			accrueFreePulls(start, false, 100_000).freePulls === 0,
		);
	}

	if (failures > 0) {
		// Thrown rather than `process.exit` — the repo carries no node types, and
		// an uncaught throw still exits non-zero for CI.
		throw new Error(`${failures} parity check(s) FAILED`);
	}
	console.log("\nAll parity checks passed.\n");
}

main();
