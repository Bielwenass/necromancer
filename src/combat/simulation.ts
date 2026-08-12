import { COMBAT_CONFIG } from "./config";
import type { EventQueue } from "./events";
import { SpatialHash } from "./spatialHash";
import type { Side, SideConfig, SimUnit } from "./types";

export type SimState = { units: SimUnit[] };

export interface PerfStats {
	hashBuildMs: number;
	accelMs: number;
	collisionMs: number;
	damageMs: number;

	// Accel sub-phases (repurposed for the aggregate model):
	queryMs: number; // fine-hash queryRadius (separation + combat)
	neighborLoopMs: number; // per-neighbor separation + combat loop
	seekFallbackMs: number; // aggregate-grid reads (cohesion/align/seek)
	integrateMs: number; // integration pass

	neighborsVisited: number; // fine-hash neighbors iterated (should be small now)
	queryCalls: number;
	maxNeighbors: number;
	unitsProcessed: number;
}

export function createSimState(): SimState {
	return { units: [] };
}

export function spawnUnits(
	config: SideConfig,
	side: Side,
	idStart: number,
	rand: () => number = Math.random,
): { units: SimUnit[]; nextId: number } {
	const units: SimUnit[] = [];
	let id = idStart;
	const { x, y, w, h } = config.spawnArea;
	for (const unit of config.units) {
		for (let i = 0; i < unit.amount; i++) {
			units.push({
				id: id++,
				type: unit.name,
				x: x + rand() * w,
				y: y + rand() * h,
				vx: 0,
				vy: 0,
				hp: unit.stats.hp,
				maxHp: unit.stats.hp,
				dmg: unit.stats.dmg,
				speed: unit.stats.speed,
				side,
			});
		}
	}
	return { units, nextId: id };
}

export function getUnitCounts(
	state: SimState,
	side: Side,
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const u of state.units) {
		if (u.side !== side) continue;
		counts[u.type] = (counts[u.type] ?? 0) + 1;
	}
	return counts;
}

export function getTotalUnitCount(state: SimState, side: Side): number {
	let count = 0;
	for (const u of state.units) {
		if (u.side === side) count++;
	}
	return count;
}

export function tickSimulation(
	state: SimState,
	dt: number,
	events: EventQueue,
	t: number,
	width: number,
	height: number,
	stats?: PerfStats,
): void {
	const cfg = COMBAT_CONFIG.simulation;
	const units = state.units;
	const N = units.length;
	if (N === 0) return;

	// ── Tunables derived from config ────────────────────────────
	// Aggregate grid: a unit reads a 3x3 block, so the block spans 3 cells.
	// Sizing a cell at cohesionRadius makes the block ~3x cohesionRadius wide —
	// a smooth approximation of "the crowd around me". Tune by eye; smaller =
	// tighter/more local cohesion, larger = broader blobs.
	const aggCell = cfg.cohesionRadius;
	// Fine hash only needs to cover the largest *short-range* interaction:
	// separation (sep radius) and combat targeting (attack radius).
	const fineRadius = Math.max(cfg.separationRadius, cfg.attackRadius);
	const fineRadius2 = fineRadius * fineRadius;

	const sepR = cfg.separationRadius;
	const sepR2 = sepR * sepR;
	const sepWeight = cfg.separationWeight;
	const enemySepWeight = cfg.enemySeparationWeight;
	const alignWeight = cfg.alignmentWeight;
	const cohWeight = cfg.cohesionWeight;
	const seekWeight = cfg.seekWeight;
	const attackR2 = cfg.attackRadius * cfg.attackRadius;
	const maxAccel = cfg.maxAccel;
	const maxAccel2 = maxAccel * maxAccel;
	const speedScale = cfg.speedScale;

	// ── Phase 1: aggregate grid + fine hash + global centroids ──
	const p1Start = stats ? performance.now() : 0;

	// Dense grid (arena is small, so a flat array beats a Map). One extra cell
	// of margin on each axis so edge units never index out of range.
	const cols = Math.max(1, Math.ceil(width / aggCell) + 1);
	const rows = Math.max(1, Math.ceil(height / aggCell) + 1);
	const nCells = cols * rows;

	// Per-side aggregates, indexed by cell. side 0 = 'a', side 1 = 'b'.
	// Layout: [sumX, sumY, sumVx, sumVy, count] per side per cell.
	const aSumX = new Float32Array(nCells);
	const aSumY = new Float32Array(nCells);
	const aSumVx = new Float32Array(nCells);
	const aSumVy = new Float32Array(nCells);
	const aCount = new Float32Array(nCells);
	const bSumX = new Float32Array(nCells);
	const bSumY = new Float32Array(nCells);
	const bSumVx = new Float32Array(nCells);
	const bSumVy = new Float32Array(nCells);
	const bCount = new Float32Array(nCells);

	const fineHash = new SpatialHash<SimUnit>(fineRadius);

	let cAx = 0,
		cAy = 0,
		cAc = 0;
	let cBx = 0,
		cBy = 0,
		cBc = 0;

	// Precompute each unit's cell index once (reused in the accel loop).
	const cellOf = new Int32Array(N);

	for (let i = 0; i < N; i++) {
		const u = units[i];
		fineHash.insert(u);

		let cx = (u.x / aggCell) | 0;
		let cy = (u.y / aggCell) | 0;
		if (cx < 0) cx = 0;
		else if (cx >= cols) cx = cols - 1;
		if (cy < 0) cy = 0;
		else if (cy >= rows) cy = rows - 1;
		const ci = cy * cols + cx;
		cellOf[i] = ci;

		if (u.side === "a") {
			aSumX[ci] += u.x;
			aSumY[ci] += u.y;
			aSumVx[ci] += u.vx;
			aSumVy[ci] += u.vy;
			aCount[ci]++;
			cAx += u.x;
			cAy += u.y;
			cAc++;
		} else {
			bSumX[ci] += u.x;
			bSumY[ci] += u.y;
			bSumVx[ci] += u.vx;
			bSumVy[ci] += u.vy;
			bCount[ci]++;
			cBx += u.x;
			cBy += u.y;
			cBc++;
		}
	}

	if (stats) stats.hashBuildMs += performance.now() - p1Start;

	// ── Phase 2: accel + integration ────────────────────────────
	const p2Start = stats ? performance.now() : 0;

	const damageBuffer = new Map<number, number>();
	const accX = new Float32Array(N);
	const accY = new Float32Array(N);

	for (let i = 0; i < N; i++) {
		const u = units[i];
		const ux = u.x,
			uy = u.y,
			uid = u.id,
			uvx = u.vx,
			uvy = u.vy;
		const sameIsA = u.side === "a";

		const ci = cellOf[i];
		const cx = ci % cols;
		const cy = (ci / cols) | 0;

		// ── sub-phase: aggregate reads (cohesion / alignment / seek) ──
		const aggStart = stats ? performance.now() : 0;

		// Same-side and enemy-side 3x3 block sums.
		let sSumX = 0,
			sSumY = 0,
			sSumVx = 0,
			sSumVy = 0,
			sCount = 0;
		let eSumX = 0,
			eSumY = 0,
			eCount = 0;

		const x0 = cx > 0 ? cx - 1 : 0;
		const x1 = cx < cols - 1 ? cx + 1 : cols - 1;
		const y0 = cy > 0 ? cy - 1 : 0;
		const y1 = cy < rows - 1 ? cy + 1 : rows - 1;

		for (let gy = y0; gy <= y1; gy++) {
			const rowBase = gy * cols;
			for (let gx = x0; gx <= x1; gx++) {
				const gi = rowBase + gx;
				if (sameIsA) {
					sSumX += aSumX[gi];
					sSumY += aSumY[gi];
					sSumVx += aSumVx[gi];
					sSumVy += aSumVy[gi];
					sCount += aCount[gi];
					eSumX += bSumX[gi];
					eSumY += bSumY[gi];
					eCount += bCount[gi];
				} else {
					sSumX += bSumX[gi];
					sSumY += bSumY[gi];
					sSumVx += bSumVx[gi];
					sSumVy += bSumVy[gi];
					sCount += bCount[gi];
					eSumX += aSumX[gi];
					eSumY += aSumY[gi];
					eCount += aCount[gi];
				}
			}
		}

		let ax = 0,
			ay = 0;

		// Cohesion: steer toward same-side local center of mass.
		// (Block includes self; at scale that's negligible noise.)
		if (sCount > 0) {
			const inv = 1 / sCount;
			ax += (sSumX * inv - ux) * cohWeight;
			ay += (sSumY * inv - uy) * cohWeight;
		}

		// Alignment: steer toward same-side local average velocity.
		if (sCount > 0) {
			const inv = 1 / sCount;
			ax += (sSumVx * inv - uvx) * alignWeight;
			ay += (sSumVy * inv - uvy) * alignWeight;
		}

		// Seek: toward enemy local COM if any enemies in the block, else toward
		// the global enemy centroid. Replaces the old radius-200 query + march.
		// Only read when haveSeek is true; zero-initialized so the hot loop needs
		// no null checks or assertions.
		let seekTx = 0,
			seekTy = 0,
			haveSeek = false;
		if (eCount > 0) {
			const inv = 1 / eCount;
			seekTx = eSumX * inv;
			seekTy = eSumY * inv;
			haveSeek = true;
		} else {
			const gc = sameIsA
				? cBc > 0
					? { x: cBx / cBc, y: cBy / cBc }
					: null
				: cAc > 0
					? { x: cAx / cAc, y: cAy / cAc }
					: null;
			if (gc) {
				seekTx = gc.x;
				seekTy = gc.y;
				haveSeek = true;
			}
		}
		if (haveSeek) {
			const dx = seekTx - ux;
			const dy = seekTy - uy;
			const d2 = dx * dx + dy * dy;
			if (d2 > 0) {
				const invD = 1 / Math.sqrt(d2);
				ax += dx * invD * seekWeight;
				ay += dy * invD * seekWeight;
			}
		}

		if (stats) stats.seekFallbackMs += performance.now() - aggStart;

		// ── sub-phase: fine query (separation + combat targeting) ──
		const qStart = stats ? performance.now() : 0;
		const neighbors = fineHash.queryRadius(ux, uy, fineRadius);
		if (stats) {
			stats.queryMs += performance.now() - qStart;
			stats.queryCalls++;
			if (neighbors.length > stats.maxNeighbors)
				stats.maxNeighbors = neighbors.length;
		}

		// ── sub-phase: neighbor loop ──
		const nlStart = stats ? performance.now() : 0;
		let nearestEnemyId = -1;
		let nearestEnemyDist2 = Infinity;

		for (const neigh of neighbors) {
			if (neigh.id === uid) continue;
			const dx = neigh.x - ux;
			const dy = neigh.y - uy;
			const d2 = dx * dx + dy * dy;
			if (d2 >= fineRadius2 || d2 <= 0) continue;

			const sameSide = neigh.side === u.side;

			// Separation (inverse-distance; spikes at contact).
			if (d2 < sepR2) {
				const d = Math.sqrt(d2);
				const dc = d < 0.5 ? 0.5 : d;
				const w = sameSide ? sepWeight : enemySepWeight;
				const k = ((sepR / dc - 1) * w) / d;
				ax -= dx * k;
				ay -= dy * k;
			}

			// Combat targeting: nearest enemy (within fine radius; gated by attackR2).
			if (!sameSide && d2 < nearestEnemyDist2) {
				nearestEnemyDist2 = d2;
				nearestEnemyId = neigh.id;
			}
		}
		if (stats) {
			stats.neighborLoopMs += performance.now() - nlStart;
			stats.neighborsVisited += neighbors.length;
			stats.unitsProcessed++;
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

		if (nearestEnemyId !== -1 && nearestEnemyDist2 < attackR2) {
			const dmg = (u.dmg ?? 1) * dt;
			damageBuffer.set(
				nearestEnemyId,
				(damageBuffer.get(nearestEnemyId) ?? 0) + dmg,
			);
		}
	}

	// ── sub-phase: integrate ──
	const intStart = stats ? performance.now() : 0;
	for (let i = 0; i < N; i++) {
		const u = units[i];
		const maxSpeed = u.speed * speedScale;
		const maxSpeed2 = maxSpeed * maxSpeed;

		u.vx += accX[i] * dt;
		u.vy += accY[i] * dt;

		const spd2 = u.vx * u.vx + u.vy * u.vy;
		if (spd2 > maxSpeed2) {
			const k = maxSpeed / Math.sqrt(spd2);
			u.vx *= k;
			u.vy *= k;
		}

		u.x += u.vx * dt;
		u.y += u.vy * dt;

		if (u.x < 0) {
			u.x = 0;
			u.vx *= -0.5;
		} else if (u.x > width) {
			u.x = width;
			u.vx *= -0.5;
		}
		if (u.y < 0) {
			u.y = 0;
			u.vy *= -0.5;
		} else if (u.y > height) {
			u.y = height;
			u.vy *= -0.5;
		}
	}
	if (stats) stats.integrateMs += performance.now() - intStart;

	if (stats) stats.accelMs += performance.now() - p2Start;

	// ── Phase 3: hard collision resolution ──────────────────────
	const p3Start = stats ? performance.now() : 0;

	const collRadius = COMBAT_CONFIG.rendering.dotRadius * 2 + 0.5;
	const collRadius2 = collRadius * collRadius;
	const collHash = new SpatialHash<SimUnit>(collRadius * 3);
	for (const u of units) collHash.insert(u);

	for (const u of units) {
		for (const n of collHash.queryRadius(u.x, u.y, collRadius)) {
			if (n.id === u.id || n.side === u.side) continue;
			const dx = u.x - n.x;
			const dy = u.y - n.y;
			const d2 = dx * dx + dy * dy;
			if (d2 >= collRadius2 || d2 < 0.0001) continue;
			const d = Math.sqrt(d2);
			const push = ((collRadius - d) * 0.5) / d;
			u.x += dx * push;
			u.y += dy * push;
		}
		if (u.x < 0) u.x = 0;
		else if (u.x > width) u.x = width;
		if (u.y < 0) u.y = 0;
		else if (u.y > height) u.y = height;
	}

	if (stats) stats.collisionMs += performance.now() - p3Start;

	// ── Phase 4: damage + dead removal ──────────────────────────
	const p4Start = stats ? performance.now() : 0;

	const dead: SimUnit[] = [];
	for (let i = 0; i < units.length; i++) {
		const u = units[i];
		const dmg = damageBuffer.get(u.id);
		if (dmg) {
			u.hp -= dmg;
			if (u.hp <= 0) dead.push(u);
		}
	}

	for (const u of dead) {
		events.emit({
			type: "kill",
			side: u.side,
			unitType: u.type,
			x: u.x,
			y: u.y,
			t,
		});
	}
	if (dead.length > 0) {
		const deadIds = new Set(dead.map((u) => u.id));
		state.units = state.units.filter((u) => !deadIds.has(u.id));
	}

	if (stats) stats.damageMs += performance.now() - p4Start;
}
