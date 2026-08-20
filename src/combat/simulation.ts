import { COMBAT_CONFIG } from "./config";
import type { EventQueue } from "./events";
import { BucketGrid } from "./grid";
import {
	SIDE_A,
	SIDE_B,
	type Side,
	type SideConfig,
	type SimUnits,
	type UnitMods,
} from "./types";

/** How much of the per-tick timing to pay for. */
export type StatsLevel = "off" | "phase" | "detail";

export interface PerfStats {
	/** Per-unit sub-phase timers, which cost enough to distort what they measure. */
	detail: boolean;

	gridBuildMs: number; // both counting sorts
	accelMs: number;
	damageMs: number;

	// Grid build split:
	fineBuildMs: number;
	cellBuildMs: number;

	// Accel sub-phases, `detail` only:
	neighborMs: number; // the one walk: separation and hard contact
	seekMs: number; // target resolve, acquisition, seek
	integrateMs: number; // integration pass

	// Work done, as opposed to time spent, and counted only while timing is on. A
	// candidate is a unit the 3x3 block walk reached; a pair is one that was inside
	// the radius and did something.
	neighborsVisited: number;
	separationPairs: number;
	collisionPairs: number; // of those, enemy pairs found overlapping
	acquisitions: number; // targets picked out of a cell
	acquireScanned: number; // units those scans looked at
	contactSwaps: number; // held target dropped for one in contact
	swings: number;
	/** Summed overlap as a share of the collision radius, before resolution. */
	overlapDepth: number;
	/** Speed carried by units in melee: what a settled contact drives to zero. */
	engagedSpeed: number;
	engagedUnits: number;
	maxNeighbors: number;
	unitsProcessed: number;
}

/**
 * Nearest enemy-holding cell for a unit of that side standing in `ci`, or -1
 * within `nearestMaxRings`. Cached per cell, since every unit standing in one
 * searches the same rings; that is what keeps the search off the per-unit path.
 *
 * It rings outward and stops one ring past the first hit, since a diagonal
 * neighbour can beat a nearer ring's far corner. Distance is in whole cells, and
 * a cell lying behind the unit costs `reverseBias` times as much, so nobody turns
 * back through their own ranks to reach a marginally closer pocket.
 */
function seekCell(
	state: SimState,
	ci: number,
	sameIsA: boolean,
	cols: number,
	rows: number,
	gcFoeX: number,
	gcFoeY: number,
): number {
	const seek = sameIsA ? state.seekA : state.seekB;
	const cached = seek[ci];
	if (cached !== -2) return cached;

	const cfg = COMBAT_CONFIG.simulation;
	const foeCount = sameIsA ? state.cellB : state.cellA;
	const cx = ci % cols;
	const cy = (ci / cols) | 0;
	const size = state.cellGrid.cellSize;
	const dirX = gcFoeX - (cx + 0.5) * size;
	const dirY = gcFoeY - (cy + 0.5) * size;
	const reverseBias = cfg.reverseBias;

	let best = -1;
	let bestD2 = Infinity;
	let stopAfter = -1;
	for (let r = 0; r <= cfg.nearestMaxRings; r++) {
		const x0 = cx - r;
		const x1 = cx + r;
		const y0 = cy - r;
		const y1 = cy + r;
		for (let gy = y0; gy <= y1; gy++) {
			if (gy < 0 || gy >= rows) continue;
			// Only the ring's perimeter: its interior was covered by a smaller r.
			const edgeRow = gy === y0 || gy === y1;
			const rowBase = gy * cols;
			for (let gx = x0; gx <= x1; gx++) {
				if (gx < 0 || gx >= cols) continue;
				if (!edgeRow && gx !== x0 && gx !== x1) continue;
				const gi = rowBase + gx;
				if (foeCount[gi] === 0) continue;
				const dx = gx - cx;
				const dy = gy - cy;
				let d2 = dx * dx + dy * dy;
				if (dx * dirX + dy * dirY < 0) d2 *= reverseBias;
				if (d2 < bestD2) {
					bestD2 = d2;
					best = gi;
				}
			}
		}
		if (best >= 0) {
			if (stopAfter < 0) stopAfter = r + 1;
			if (r >= stopAfter) break;
		}
	}
	seek[ci] = best;
	return best;
}

/**
 * The enemy a unit commits to out of one cell: the nearest, preferring any not
 * already fated to die this tick so a swarm spreads its blows rather than
 * emptying into one body. That preference stops at `reach`, since standing idle
 * beside a dying enemy to save a blow for one further off costs more than the
 * overkill does.
 */
function nearestInCell(
	state: SimState,
	cell: number,
	px: number,
	py: number,
	reach: number,
	sameIsA: boolean,
	stats?: PerfStats,
): number {
	const u = state.units;
	const grid = state.cellGrid;
	const order = grid.order;
	const end = grid.cellStart[cell + 1];
	if (stats) {
		stats.acquisitions++;
		stats.acquireScanned += end - grid.cellStart[cell];
	}
	const foeSide = sameIsA ? SIDE_B : SIDE_A;
	const damage = state.damage;
	let live = -1;
	let liveD2 = Infinity;
	let any = -1;
	let anyD2 = Infinity;
	for (let k = grid.cellStart[cell]; k < end; k++) {
		const j = order[k];
		if (u.side[j] !== foeSide) continue;
		const dx = u.x[j] - px;
		const dy = u.y[j] - py;
		const d2 = dx * dx + dy * dy;
		if (d2 < anyD2) {
			anyD2 = d2;
			any = j;
		}
		if (u.hp[j] > damage[j] && d2 < liveD2) {
			liveD2 = d2;
			live = j;
		}
	}
	if (live < 0) return any;
	return anyD2 < reach * reach && liveD2 > reach * reach ? any : live;
}

/** Per-cell live counts per side, plus the cached search each side reads. */
function sizeCells(state: SimState, nCells: number): void {
	if (state.cellA.length < nCells) {
		state.cellA = new Int32Array(nCells);
		state.cellB = new Int32Array(nCells);
		state.seekA = new Int32Array(nCells);
		state.seekB = new Int32Array(nCells);
		return;
	}
	state.cellA.fill(0, 0, nCells);
	state.cellB.fill(0, 0, nCells);
}

export type SimState = {
	units: SimUnits;
	/** Unit type names, indexed by `SimUnits.typeId`. */
	typeNames: string[];
	startCount: Record<Side, number>;

	// Per-tick scratch. Owned by the state, so one fight never leaks into the next.
	accX: Float32Array;
	accY: Float32Array;
	damage: Float32Array;
	dead: Uint8Array;
	/** Slot holding each unit id, -1 once it dies. Index 0 is the "no target" id. */
	slotOfId: Int32Array;
	/** Hard-contact correction, applied at integration: position then velocity. */
	pushX: Float32Array;
	pushY: Float32Array;
	pushVx: Float32Array;
	pushVy: Float32Array;
	/** What the pair pass leaves for the unit pass: crowd counts and the toucher. */
	nearSame: Int32Array;
	nearFoe: Int32Array;
	contactOf: Int32Array;
	contactD2: Float32Array;
	fineGrid: BucketGrid;
	cellGrid: BucketGrid;
	cellA: Int32Array;
	cellB: Int32Array;
	/** Nearest enemy cell for a unit of that side standing here; -2 unsearched. */
	seekA: Int32Array;
	seekB: Int32Array;
};

function createUnits(): SimUnits {
	return {
		count: 0,
		capacity: 0,
		id: new Int32Array(0),
		typeId: new Uint8Array(0),
		side: new Uint8Array(0),
		x: new Float32Array(0),
		y: new Float32Array(0),
		vx: new Float32Array(0),
		vy: new Float32Array(0),
		hp: new Float32Array(0),
		maxHp: new Float32Array(0),
		dmg: new Float32Array(0),
		speed: new Float32Array(0),
		swingCooldown: new Float32Array(0),
		revived: new Uint8Array(0),
		reach: new Float32Array(0),
		targetId: new Int32Array(0),
		mods: [],
	};
}

function grow(u: SimUnits, needed: number): void {
	if (needed <= u.capacity) return;
	const cap = Math.max(needed, u.capacity * 2, 64);
	const i32 = (old: Int32Array) => {
		const next = new Int32Array(cap);
		next.set(old);
		return next;
	};
	const u8 = (old: Uint8Array) => {
		const next = new Uint8Array(cap);
		next.set(old);
		return next;
	};
	const f32 = (old: Float32Array) => {
		const next = new Float32Array(cap);
		next.set(old);
		return next;
	};
	u.id = i32(u.id);
	u.typeId = u8(u.typeId);
	u.side = u8(u.side);
	u.x = f32(u.x);
	u.y = f32(u.y);
	u.vx = f32(u.vx);
	u.vy = f32(u.vy);
	u.hp = f32(u.hp);
	u.maxHp = f32(u.maxHp);
	u.dmg = f32(u.dmg);
	u.speed = f32(u.speed);
	u.swingCooldown = f32(u.swingCooldown);
	u.revived = u8(u.revived);
	u.reach = f32(u.reach);
	u.targetId = i32(u.targetId);
	u.capacity = cap;
}

export function createSimState(): SimState {
	return {
		units: createUnits(),
		typeNames: [],
		startCount: { a: 0, b: 0 },
		accX: new Float32Array(0),
		accY: new Float32Array(0),
		damage: new Float32Array(0),
		dead: new Uint8Array(0),
		slotOfId: new Int32Array(0),
		pushX: new Float32Array(0),
		pushY: new Float32Array(0),
		pushVx: new Float32Array(0),
		pushVy: new Float32Array(0),
		nearSame: new Int32Array(0),
		nearFoe: new Int32Array(0),
		contactOf: new Int32Array(0),
		contactD2: new Float32Array(0),
		fineGrid: new BucketGrid(),
		cellGrid: new BucketGrid(),
		cellA: new Int32Array(0),
		cellB: new Int32Array(0),
		seekA: new Int32Array(0),
		seekB: new Int32Array(0),
	};
}

export function finalizeSpawn(
	state: SimState,
	rand: () => number = Math.random,
): void {
	const u = state.units;
	state.startCount = { a: 0, b: 0 };
	const cfg = COMBAT_CONFIG.simulation;
	const interval = cfg.attackIntervalMs / 1000;
	// Ids are dense from 1, so the slot map is an array and 0 reads as "no target".
	state.slotOfId = new Int32Array(u.count + 1).fill(-1);
	for (let i = 0; i < u.count; i++) {
		if (u.side[i] === SIDE_A) state.startCount.a++;
		else state.startCount.b++;
		state.slotOfId[u.id[i]] = i;
		// Scatter the first swing across one interval, or a side swings in lockstep.
		// Drawn after `spawnUnits` so layout is unchanged.
		u.swingCooldown[i] = rand() * interval;
	}

	state.accX = new Float32Array(u.count);
	state.accY = new Float32Array(u.count);
	state.pushX = new Float32Array(u.count);
	state.pushY = new Float32Array(u.count);
	state.pushVx = new Float32Array(u.count);
	state.pushVy = new Float32Array(u.count);
	state.nearSame = new Int32Array(u.count);
	state.nearFoe = new Int32Array(u.count);
	state.contactOf = new Int32Array(u.count);
	state.contactD2 = new Float32Array(u.count);
	state.damage = new Float32Array(u.count);
	state.dead = new Uint8Array(u.count);
}

/**
 * Which side is ahead on the fraction of its muster standing, so the smaller
 * force isn't punished for its size. Calls a fight past `MAX_FIGHT_MS`.
 */
export function leadingSide(state: SimState): Side | "draw" {
	const fracA =
		state.startCount.a > 0 ? countSide(state, "a") / state.startCount.a : 0;
	const fracB =
		state.startCount.b > 0 ? countSide(state, "b") / state.startCount.b : 0;
	if (fracA > fracB) return "a";
	if (fracB > fracA) return "b";
	return "draw";
}

function countSide(state: SimState, side: Side): number {
	const u = state.units;
	const want = side === "a" ? SIDE_A : 1;
	let count = 0;
	for (let i = 0; i < u.count; i++) if (u.side[i] === want) count++;
	return count;
}

export function spawnUnits(
	state: SimState,
	config: SideConfig,
	side: Side,
	idStart: number,
	rand: () => number = Math.random,
): number {
	const u = state.units;
	let total = 0;
	for (const def of config.units) total += def.amount;
	grow(u, u.count + total);

	const sideId = side === "a" ? SIDE_A : 1;
	let id = idStart;
	const { x, y, w, h } = config.spawnArea;
	for (const def of config.units) {
		let typeId = state.typeNames.indexOf(def.name);
		if (typeId < 0) {
			typeId = state.typeNames.length;
			state.typeNames.push(def.name);
		}
		const mods: UnitMods | null = def.mods ?? null;
		const reach = def.stats.reach ?? COMBAT_CONFIG.simulation.attackRadius;
		for (let k = 0; k < def.amount; k++) {
			const i = u.count++;
			u.id[i] = id++;
			u.typeId[i] = typeId;
			u.side[i] = sideId;
			u.x[i] = x + rand() * w;
			u.y[i] = y + rand() * h;
			u.vx[i] = 0;
			u.vy[i] = 0;
			u.hp[i] = def.stats.hp;
			u.maxHp[i] = def.stats.hp;
			u.dmg[i] = def.stats.dmg;
			u.speed[i] = def.stats.speed;
			u.swingCooldown[i] = 0;
			u.revived[i] = 0;
			u.reach[i] = reach;
			u.targetId[i] = 0;
			u.mods[i] = mods;
		}
	}
	return id;
}

export function getUnitCounts(
	state: SimState,
	side: Side,
): Record<string, number> {
	const u = state.units;
	const want = side === "a" ? SIDE_A : 1;
	const counts: Record<string, number> = {};
	for (let i = 0; i < u.count; i++) {
		if (u.side[i] !== want) continue;
		const name = state.typeNames[u.typeId[i]];
		counts[name] = (counts[name] ?? 0) + 1;
	}
	return counts;
}

export function getTotalUnitCount(state: SimState, side: Side): number {
	return countSide(state, side);
}

/** Collision footprint, shrinking as the field fills so a big fight stays cheap. */
export function collisionRadius(unitCount: number): number {
	const coll = COMBAT_CONFIG.collision;
	const base =
		COMBAT_CONFIG.rendering.dotRadius * coll.radiusPerDot + coll.radiusMargin;
	return base * radiusScale(unitCount);
}

/** Area per unit is held roughly constant, hence the inverse square root. */
export function radiusScale(unitCount: number): number {
	const coll = COMBAT_CONFIG.collision;
	if (unitCount <= 0) return 1;
	const s = Math.sqrt(coll.radiusScaleRefCount / unitCount);
	if (s > 1) return 1;
	return s < coll.radiusScaleMin ? coll.radiusScaleMin : s;
}

/** Live counts per side, so the caller needn't rescan to decide the fight. */
export type TickCounts = { a: number; b: number };

export function tickSimulation(
	state: SimState,
	dt: number,
	events: EventQueue,
	t: number,
	width: number,
	height: number,
	stats?: PerfStats,
): TickCounts {
	const cfg = COMBAT_CONFIG.simulation;
	const u = state.units;
	const N = u.count;
	if (N === 0) return { a: 0, b: 0 };

	// Present only at `detail`, so the per-unit timers are one check, not two.
	const detail = stats?.detail === true ? stats : undefined;
	const ux = u.x;
	const uy = u.y;
	const uvx = u.vx;
	const uvy = u.vy;
	const uside = u.side;

	const mcfg = COMBAT_CONFIG.modifiers;
	const inOpening = t < mcfg.openingWindowMs;

	// One walk carries separation and hard contact; a target is held by id, never
	// searched for. The radius covers whichever of the two reaches further.
	const sepR = cfg.separationRadius;
	const sepR2 = sepR * sepR;
	const coll = COMBAT_CONFIG.collision;
	const collRadius = collisionRadius(N);
	const collRadius2 = collRadius * collRadius;
	const correction = coll.correction;
	const velocityAbsorb = coll.velocityAbsorb;
	const minSep2 = coll.minSeparation2;
	const walkR = sepR > collRadius ? sepR : collRadius;
	const walkR2 = walkR * walkR;
	const sepWeight = cfg.separationWeight;
	const enemySepWeight = cfg.enemySeparationWeight;
	const maxAccelDial = cfg.maxAccel;
	// Seek is normalised, so its magnitude is exactly `seekWeight`. Capping it here
	// rather than letting the accel clamp swallow it keeps the dial honest: past
	// `maxAccel` a unit is already turning as hard as it can, and `engagedSeekScale`
	// then divides a bounded budget rather than an arbitrary number.
	const seekWeight =
		cfg.seekWeight < maxAccelDial ? cfg.seekWeight : maxAccelDial;
	const engagedSeek = cfg.engagedSeekScale;
	const engagedDamping = cfg.engagedDamping;
	const commitR2 = cfg.commitRadius * cfg.commitRadius;
	const swingInterval = cfg.attackIntervalMs / 1000;
	const maxAccel = maxAccelDial;
	const maxAccel2 = maxAccel * maxAccel;
	const speedScale = cfg.speedScale;
	const sepMinD = cfg.separationMinDistance;
	const defaultDmg = cfg.defaultDamage;
	const wallRestitution = cfg.wallRestitution;

	// ── Phase 1: grids, per-cell counts, global centroids ───────
	const p1Start = stats ? performance.now() : 0;

	const fine = state.fineGrid;
	fine.build(ux, uy, N, walkR, width, height);
	const fineBuilt = stats ? performance.now() : 0;

	const cellGrid = state.cellGrid;
	cellGrid.build(ux, uy, N, cfg.steerCellSize, width, height);
	if (stats) {
		stats.fineBuildMs += fineBuilt - p1Start;
		stats.cellBuildMs += performance.now() - fineBuilt;
	}
	const cols = cellGrid.cols;
	const rows = cellGrid.rows;
	const cellSize = cellGrid.cellSize;
	const nCells = cols * rows;
	sizeCells(state, nCells);
	const cellA = state.cellA;
	const cellB = state.cellB;
	state.seekA.fill(-2, 0, nCells);
	state.seekB.fill(-2, 0, nCells);

	let cAx = 0;
	let cAy = 0;
	let cAc = 0;
	let cBx = 0;
	let cBy = 0;
	let cBc = 0;
	const cellOf = cellGrid.cellOf;

	for (let i = 0; i < N; i++) {
		if (uside[i] === SIDE_A) {
			cellA[cellOf[i]]++;
			cAx += ux[i];
			cAy += uy[i];
			cAc++;
		} else {
			cellB[cellOf[i]]++;
			cBx += ux[i];
			cBy += uy[i];
			cBc++;
		}
	}

	// The global centroid each side falls back to, hoisted out of the unit loop.
	const gcAx = cAc > 0 ? cAx / cAc : 0;
	const gcAy = cAc > 0 ? cAy / cAc : 0;
	const gcBx = cBc > 0 ? cBx / cBc : 0;
	const gcBy = cBc > 0 ? cBy / cBc : 0;

	if (stats) stats.gridBuildMs += performance.now() - p1Start;

	// ── Phase 2: accel + integration ────────────────────────────
	const p2Start = stats ? performance.now() : 0;

	const accX = state.accX;
	const accY = state.accY;
	const damage = state.damage;
	damage.fill(0, 0, N);
	const pushX = state.pushX;
	const pushY = state.pushY;
	const pushVx = state.pushVx;
	const pushVy = state.pushVy;
	pushX.fill(0, 0, N);
	pushY.fill(0, 0, N);
	pushVx.fill(0, 0, N);
	pushVy.fill(0, 0, N);

	// Share of each side standing, for `lastStand`; counts come free from phase 1.
	const overwhelmCap = mcfg.overwhelmCap;
	const lastStandThreshold = mcfg.lastStandThreshold;
	const fracA = state.startCount.a > 0 ? cAc / state.startCount.a : 1;
	const fracB = state.startCount.b > 0 ? cBc / state.startCount.b : 1;

	let collPairs = 0;
	let collDepth = 0;
	const fcols = fine.cols;
	const frows = fine.rows;
	const fineStart = fine.cellStart;
	const fineOrder = fine.order;
	const fineCellOf = fine.cellOf;

	const nearSameOf = state.nearSame;
	const nearFoeOf = state.nearFoe;
	const contactOf = state.contactOf;
	const contactD2Of = state.contactD2;
	accX.fill(0, 0, N);
	accY.fill(0, 0, N);
	nearSameOf.fill(0, 0, N);
	nearFoeOf.fill(0, 0, N);
	contactOf.fill(-1, 0, N);
	contactD2Of.fill(Infinity, 0, N);

	// ── sub-phase: the pair walk ──
	// Every term here is symmetric, so a pair is tested once and both ends are
	// paid at the same time. Walking in grid order makes "once" cheap: the units
	// after this one in its own cell, then its east neighbour, run together in
	// `order`, and the row below is the other half of the block. West and north
	// arrive when those units take their own turn.
	const nlStart = detail ? performance.now() : 0;
	let visited = 0;
	let pairs = 0;
	let maxRun = 0;
	for (let k = 0; k < N; k++) {
		const i = fineOrder[k];
		const px = ux[i];
		const py = uy[i];
		const pvx = uvx[i];
		const pvy = uvy[i];
		const sideI = uside[i];

		const ci = fineCellOf[i];
		const cx = ci % fcols;
		const cy = (ci / fcols) | 0;
		const aEnd = fineStart[ci + (cx < fcols - 1 ? 2 : 1)];
		let bStart = 0;
		let bEnd = 0;
		if (cy < frows - 1) {
			const rowBase = ci + fcols - cx;
			bStart = fineStart[rowBase + (cx > 0 ? cx - 1 : 0)];
			bEnd = fineStart[rowBase + (cx < fcols - 1 ? cx + 2 : fcols)];
		}
		if (stats) {
			const run = aEnd - k - 1 + (bEnd - bStart);
			if (run > maxRun) maxRun = run;
		}

		for (let seg = 0; seg < 2; seg++) {
			const stop = seg === 0 ? aEnd : bEnd;
			for (let kk = seg === 0 ? k + 1 : bStart; kk < stop; kk++) {
				const j = fineOrder[kk];
				visited++;
				const dx = ux[j] - px;
				const dy = uy[j] - py;
				const d2 = dx * dx + dy * dy;
				if (d2 >= walkR2 || d2 <= 0) continue;
				const d = Math.sqrt(d2);
				const sameSide = uside[j] === sideI;

				if (d2 < sepR2) {
					if (stats) pairs++;
					const dc = d < sepMinD ? sepMinD : d;
					const w = sameSide ? sepWeight : enemySepWeight;
					const k2 = ((sepR / dc - 1) * w) / d;
					const fx = dx * k2;
					const fy = dy * k2;
					accX[i] -= fx;
					accY[i] -= fy;
					accX[j] += fx;
					accY[j] += fy;
				}

				if (sameSide) {
					nearSameOf[i]++;
					nearSameOf[j]++;
					continue;
				}
				nearFoeOf[i]++;
				nearFoeOf[j]++;
				if (d2 < contactD2Of[i]) {
					contactD2Of[i] = d2;
					contactOf[i] = j;
				}
				if (d2 < contactD2Of[j]) {
					contactD2Of[j] = d2;
					contactOf[j] = i;
				}

				// Hard contact rides the same distance: dots resolve just shy of
				// overlapping, and the closing normal velocity goes with the push or
				// the pair re-forms next tick.
				if (d2 < collRadius2 && d2 >= minSep2) {
					if (stats) {
						collPairs++;
						collDepth += (collRadius - d) / collRadius;
					}
					const invD = 1 / d;
					const nx = -dx * invD;
					const ny = -dy * invD;
					const push = (collRadius - d) * correction;
					const sx = nx * push;
					const sy = ny * push;
					pushX[i] += sx;
					pushY[i] += sy;
					pushX[j] -= sx;
					pushY[j] -= sy;
					const closing = (pvx - uvx[j]) * nx + (pvy - uvy[j]) * ny;
					if (closing < 0) {
						const k2 = closing * velocityAbsorb;
						pushVx[i] -= k2 * nx;
						pushVy[i] -= k2 * ny;
						pushVx[j] += k2 * nx;
						pushVy[j] += k2 * ny;
					}
				}
			}
		}
	}
	if (detail) detail.neighborMs += performance.now() - nlStart;
	if (stats) {
		stats.neighborsVisited += visited;
		stats.separationPairs += pairs;
		if (maxRun > stats.maxNeighbors) stats.maxNeighbors = maxRun;
	}

	// ── sub-phase: per unit, target and swing ──
	for (let i = 0; i < N; i++) {
		const px = ux[i];
		const py = uy[i];
		const pvx = uvx[i];
		const pvy = uvy[i];
		const sameIsA = uside[i] === SIDE_A;
		const contact = contactOf[i];
		const nearSame = nearSameOf[i];
		const nearFoe = nearFoeOf[i];

		// ── sub-phase: hold or acquire a target ──
		const tgtStart = detail ? performance.now() : 0;

		const ci = cellOf[i];
		const reach = u.reach[i];
		let ts = state.slotOfId[u.targetId[i]];
		let tdx = 0;
		let tdy = 0;
		let td2 = 0;
		if (ts >= 0) {
			tdx = ux[ts] - px;
			tdy = uy[ts] - py;
			td2 = tdx * tdx + tdy * tdy;
		}
		// The man in front of you beats the man you picked. It is the only thing that
		// breaks a hold, so a charge across open ground is never called off half way,
		// a screened target never leaves a unit standing in a scrum not swinging, and
		// a re-pick costs no search at all.
		if (contact >= 0 && (ts < 0 || td2 > reach * reach)) {
			if (stats) stats.contactSwaps++;
			ts = contact;
			tdx = ux[ts] - px;
			tdy = uy[ts] - py;
			td2 = contactD2Of[i];
			u.targetId[i] = u.id[ts];
		}
		if (ts < 0) {
			const cell = seekCell(
				state,
				ci,
				sameIsA,
				cols,
				rows,
				sameIsA ? gcBx : gcAx,
				sameIsA ? gcBy : gcAy,
			);
			if (cell >= 0) {
				tdx = ((cell % cols) + 0.5) * cellSize - px;
				tdy = (((cell / cols) | 0) + 0.5) * cellSize - py;
				td2 = tdx * tdx + tdy * tdy;
			} else if (sameIsA ? cBc > 0 : cAc > 0) {
				// Nothing within the rings: close on the enemy's global centre.
				tdx = (sameIsA ? gcBx : gcAx) - px;
				tdy = (sameIsA ? gcBy : gcAy) - py;
				td2 = tdx * tdx + tdy * tdy;
			}
			// A unit picks its man on arrival, not across the field: committing at
			// range fans a charge into as many threads as there are enemies.
			if (cell >= 0 && td2 < commitR2) {
				ts = nearestInCell(state, cell, px, py, reach, sameIsA, stats);
				if (ts >= 0) {
					tdx = ux[ts] - px;
					tdy = uy[ts] - py;
					td2 = tdx * tdx + tdy * tdy;
				}
			}
			u.targetId[i] = ts >= 0 ? u.id[ts] : 0;
		}

		// Held aside: seek alone can saturate the accel clamp, and engagement decides
		// whether a unit in melee gets it.
		let seekAx = 0;
		let seekAy = 0;
		if (td2 > 0) {
			const inv = seekWeight / Math.sqrt(td2);
			seekAx = tdx * inv;
			seekAy = tdy * inv;
		}

		if (detail) detail.seekMs += performance.now() - tgtStart;

		// Engaged = the target is inside this unit's reach, the same test that gates a
		// swing. It brakes; full seek would jitter against the positional pass.
		const engaged = ts >= 0 && td2 < reach * reach;
		if (stats && engaged) {
			stats.engagedUnits++;
			stats.engagedSpeed += Math.sqrt(pvx * pvx + pvy * pvy);
		}
		let ax = accX[i];
		let ay = accY[i];
		if (engaged) {
			ax += seekAx * engagedSeek - pvx * engagedDamping;
			ay += seekAy * engagedSeek - pvy * engagedDamping;
		} else {
			ax += seekAx;
			ay += seekAy;
		}

		// Clamp acceleration.
		const aMag2 = ax * ax + ay * ay;
		if (aMag2 > maxAccel2) {
			const k = maxAccel / Math.sqrt(aMag2);
			ax *= k;
			ay *= k;
		}

		accX[i] = ax;
		accY[i] = ay;
		if (stats) stats.unitsProcessed++;

		// Floored, so a unit crossing the arena arrives with one blow and no backlog.
		const cd = u.swingCooldown[i];
		u.swingCooldown[i] = cd > dt ? cd - dt : 0;

		if (engaged && u.swingCooldown[i] === 0) {
			// Blows already landed this tick are enough: leave it dead, keep the swing
			// and take another target next tick.
			const remaining = u.hp[ts] - damage[ts];
			if (remaining <= 0) {
				u.targetId[i] = 0;
			} else {
				// Assigned, so no unit banks blows across a gap in targets. Quantizing to
				// whole steps costs under 2% of nominal DPS.
				u.swingCooldown[i] = swingInterval;
				if (stats) stats.swings++;
				let dmg = (u.dmg[i] || defaultDmg) * swingInterval;

				const mods = u.mods[i];
				if (mods !== null) {
					// Additive into one multiplier, so stacking two can't compound.
					let mult = 1;
					if (mods.berserk > 0) {
						mult += mods.berserk * (1 - u.hp[i] / u.maxHp[i]);
					}
					if (mods.vanguard > 0 && inOpening) mult += mods.vanguard;
					if (mods.overwhelm > 0 && nearFoe > 0) {
						const advantage = nearSame / nearFoe - 1;
						if (advantage > 0) {
							mult +=
								mods.overwhelm *
								(advantage < overwhelmCap ? advantage : overwhelmCap);
						}
					}
					if (mods.executioner > 0 || mods.spectral > 0) {
						const targetHp = u.hp[ts] / u.maxHp[ts];
						mult +=
							mods.executioner * (1 - targetHp) + mods.spectral * targetHp;
					}
					if (mods.lastStand > 0) {
						const frac = sameIsA ? fracA : fracB;
						if (frac < lastStandThreshold) mult += mods.lastStand;
					}
					dmg *= mult;
				}

				// Overkill is dropped rather than banked against a corpse, so a swarm's
				// blows land on the living.
				const landed = dmg < remaining ? dmg : remaining;
				damage[ts] += landed;

				const lifesteal = mods !== null ? mods.lifesteal : 0;
				if (lifesteal > 0) {
					const healed = u.hp[i] + landed * lifesteal;
					u.hp[i] = healed > u.maxHp[i] ? u.maxHp[i] : healed;
				}
			}
		}
	}

	// ── sub-phase: integrate ──
	const intStart = detail ? performance.now() : 0;
	for (let i = 0; i < N; i++) {
		const maxSpeed = u.speed[i] * speedScale;
		const maxSpeed2 = maxSpeed * maxSpeed;

		let vx = uvx[i] + accX[i] * dt;
		let vy = uvy[i] + accY[i] * dt;

		const spd2 = vx * vx + vy * vy;
		if (spd2 > maxSpeed2) {
			const k = maxSpeed / Math.sqrt(spd2);
			vx *= k;
			vy *= k;
		}

		// Contact is a correction, not a force: it lands outside the speed clamp,
		// or a shove would read as a unit exceeding its own speed.
		vx += pushVx[i];
		vy += pushVy[i];

		let x = ux[i] + vx * dt + pushX[i];
		let y = uy[i] + vy * dt + pushY[i];

		if (x < 0) {
			x = 0;
			vx *= -wallRestitution;
		} else if (x > width) {
			x = width;
			vx *= -wallRestitution;
		}
		if (y < 0) {
			y = 0;
			vy *= -wallRestitution;
		} else if (y > height) {
			y = height;
			vy *= -wallRestitution;
		}

		ux[i] = x;
		uy[i] = y;
		uvx[i] = vx;
		uvy[i] = vy;
	}
	if (detail) detail.integrateMs += performance.now() - intStart;

	if (stats) {
		stats.accelMs += performance.now() - p2Start;
		stats.collisionPairs += collPairs;
		stats.overlapDepth += collDepth;
	}

	// ── Phase 3: damage + dead removal ──────────────────────────
	const p4Start = stats ? performance.now() : 0;

	const dead = state.dead;
	dead.fill(0, 0, N);
	let deadCount = 0;

	for (let i = 0; i < N; i++) {
		const dmg = damage[i];
		if (dmg > 0) {
			const hp = u.hp[i] - dmg;
			u.hp[i] = hp;
			if (hp <= 0) {
				const mods = u.mods[i];
				// A revive spends itself here; the unit never dies, keeping its id,
				// position and place in the survivor count.
				if (mods !== null && mods.revive > 0 && u.revived[i] === 0) {
					u.revived[i] = 1;
					u.hp[i] = u.maxHp[i] * mods.revive;
				} else {
					dead[i] = 1;
					deadCount++;
					events.emit({
						type: "kill",
						side: uside[i] === SIDE_A ? "a" : "b",
						unitType: state.typeNames[u.typeId[i]],
						x: ux[i],
						y: uy[i],
						t,
					});
					continue;
				}
			}
		}
		const mods = u.mods[i];
		if (mods !== null && mods.regen > 0 && u.hp[i] < u.maxHp[i]) {
			const healed = u.hp[i] + u.maxHp[i] * mods.regen * dt;
			u.hp[i] = healed > u.maxHp[i] ? u.maxHp[i] : healed;
		}
	}

	if (deadCount > 0) {
		// Swap-remove: the last live slot fills the hole, so slot order is not spawn
		// order after the first death. `slotOfId` is what makes a held target survive
		// the shuffle, so it moves with the unit.
		const slotOfId = state.slotOfId;
		let live = N;
		let i = 0;
		while (i < live) {
			if (dead[i] === 0) {
				i++;
				continue;
			}
			slotOfId[u.id[i]] = -1;
			live--;
			if (i !== live) {
				moveUnit(u, live, i);
				slotOfId[u.id[i]] = i;
				dead[i] = dead[live];
			} else {
				dead[i] = 0;
			}
		}
		u.count = live;
	}

	let liveA = 0;
	for (let i = 0; i < u.count; i++) if (uside[i] === SIDE_A) liveA++;

	if (stats) stats.damageMs += performance.now() - p4Start;

	return { a: liveA, b: u.count - liveA };
}

function moveUnit(u: SimUnits, from: number, to: number): void {
	u.id[to] = u.id[from];
	u.typeId[to] = u.typeId[from];
	u.side[to] = u.side[from];
	u.x[to] = u.x[from];
	u.y[to] = u.y[from];
	u.vx[to] = u.vx[from];
	u.vy[to] = u.vy[from];
	u.hp[to] = u.hp[from];
	u.maxHp[to] = u.maxHp[from];
	u.dmg[to] = u.dmg[from];
	u.speed[to] = u.speed[from];
	u.swingCooldown[to] = u.swingCooldown[from];
	u.revived[to] = u.revived[from];
	u.reach[to] = u.reach[from];
	u.targetId[to] = u.targetId[from];
	u.mods[to] = u.mods[from];
}
