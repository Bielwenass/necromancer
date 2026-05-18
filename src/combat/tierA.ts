import type { UnitA, Side, SideConfig } from './types';
import type { EventQueue } from './events';
import { COMBAT_CONFIG } from './config';
import { SpatialHash } from './spatialHash';

export type TierAState = { units: UnitA[] };

export interface PerfStats {
  hashBuildMs: number;
  accelMs: number;
  collisionMs: number;
  damageMs: number;
}

export function createTierAState(): TierAState {
  return { units: [] };
}

export function spawnUnitsA(
  config: SideConfig,
  side: Side,
  idStart: number,
  rand: () => number = Math.random,
): { units: UnitA[]; nextId: number } {
  const units: UnitA[] = [];
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

export function getCountsA(state: TierAState, side: Side): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of state.units) {
    if (u.side !== side) continue;
    counts[u.type] = (counts[u.type] ?? 0) + 1;
  }
  return counts;
}

export function getTotalCountA(state: TierAState, side: Side): number {
  let count = 0;
  for (const u of state.units) {
    if (u.side === side) count++;
  }
  return count;
}

export function tickTierA(
  state: TierAState,
  dt: number,
  events: EventQueue,
  t: number,
  width: number,
  height: number,
  stats?: PerfStats,
): void {
  const cfg = COMBAT_CONFIG.tierA;
  const units = state.units;
  if (units.length === 0) return;

  // Hoist cfg fields into locals and precompute squared radii.
  // Squared comparisons let us defer Math.sqrt() inside the neighbor loop
  // to only the branches that actually need d for normalization.
  const sepR = cfg.separationRadius;
  const sepR2 = sepR * sepR;
  const alignR2 = cfg.alignmentRadius * cfg.alignmentRadius;
  const cohR = cfg.cohesionRadius;
  const cohR2 = cohR * cohR;
  const seekR = cfg.seekRadius;
  const seekR2 = seekR * seekR;
  const sepWeight = cfg.separationWeight;
  const enemySepWeight = cfg.enemySeparationWeight;
  const alignWeight = cfg.alignmentWeight;
  const cohWeight = cfg.cohesionWeight;
  const seekWeight = cfg.seekWeight;
  const attackR2 = cfg.attackRadius * cfg.attackRadius;
  const maxAccel = cfg.maxAccel;
  const maxAccel2 = maxAccel * maxAccel;
  const speedScale = cfg.speedScale;

  // ── Phase 1: spatial hash build + centroid ──────────────────
  const p1Start = stats ? performance.now() : 0;

  // Build spatial hash
  const hash = new SpatialHash<UnitA>(cfg.spatialCellSize);
  for (const u of units) hash.insert(u);

  // Compute enemy centroid per side as global march fallback
  const centroid: Record<Side, { x: number; y: number; count: number }> = {
    a: { x: 0, y: 0, count: 0 },
    b: { x: 0, y: 0, count: 0 },
  };
  for (const u of units) {
    centroid[u.side].x += u.x;
    centroid[u.side].y += u.y;
    centroid[u.side].count++;
  }

  if (stats) stats.hashBuildMs += performance.now() - p1Start;

  // ── Phase 2: accelerations + integration ────────────────────
  const p2Start = stats ? performance.now() : 0;

  const damageBuffer = new Map<number, number>();

  // Accelerations to accumulate
  const accX = new Float32Array(units.length);
  const accY = new Float32Array(units.length);

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const ux = u.x, uy = u.y, uid = u.id, uside = u.side, uvx = u.vx, uvy = u.vy;

    // Query neighbors — wide enough for cohesion and local seek
    const neighbors = hash.queryRadius(ux, uy, cohR);

    // Direct-accumulation acceleration (separation applied inline, not averaged)
    let ax = 0, ay = 0;
    let alignVx = 0, alignVy = 0, alignCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;
    let seekX = 0, seekY = 0, seekCount = 0;
    let nearestEnemyId = -1;
    let nearestEnemyDist2 = Infinity;

    for (const neigh of neighbors) {
      if (neigh.id === uid) continue;
      const dx = neigh.x - ux;
      const dy = neigh.y - uy;
      const d2 = dx * dx + dy * dy;
      // d (the unsquared distance) is computed lazily — only branches that
      // need it for normalization (dx/d, dy/d) trigger the sqrt.
      let d = -1;

      if (neigh.side === uside) {
        // Separation: inverse-distance so force spikes when very close
        if (d2 < sepR2 && d2 > 0) {
          d = Math.sqrt(d2);
          const dc = d < 0.5 ? 0.5 : d;
          // Factor strength * weight / d once → 1 div instead of 2
          const k = (sepR / dc - 1) * sepWeight / d;
          ax -= dx * k;
          ay -= dy * k;
        }
        if (d2 < alignR2) {
          alignVx += neigh.vx; alignVy += neigh.vy; alignCount++;
        }
        if (d2 < cohR2) {
          cohX += neigh.x; cohY += neigh.y; cohCount++;
        }
      } else {
        // Enemy separation: weaker push — slows penetration without blocking combat
        if (d2 < sepR2 && d2 > 0) {
          d = Math.sqrt(d2);
          const dc = d < 0.5 ? 0.5 : d;
          const k = (sepR / dc - 1) * enemySepWeight / d;
          ax -= dx * k;
          ay -= dy * k;
        }
        // Local seek
        if (d2 < seekR2 && d2 > 0) {
          if (d < 0) d = Math.sqrt(d2);
          const invD = 1 / d;
          seekX += dx * invD;
          seekY += dy * invD;
          seekCount++;
        }
        if (d2 < nearestEnemyDist2) {
          nearestEnemyDist2 = d2; nearestEnemyId = neigh.id;
        }
      }
    }

    // Widen seek search if no enemies found in cohesion radius
    if (seekCount === 0) {
      const enemyNeighbors = hash.queryRadius(ux, uy, seekR);
      for (const neigh of enemyNeighbors) {
        if (neigh.side === uside) continue;
        const dx = neigh.x - ux;
        const dy = neigh.y - uy;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0) {
          const invD = 1 / Math.sqrt(d2);
          seekX += dx * invD;
          seekY += dy * invD;
        }
        seekCount++;
        if (d2 < nearestEnemyDist2) { nearestEnemyDist2 = d2; nearestEnemyId = neigh.id; }
      }
    }

    // Global march: if still no visible enemies, steer toward enemy centroid
    if (seekCount === 0) {
      const enemySide: Side = uside === 'a' ? 'b' : 'a';
      const ec = centroid[enemySide];
      if (ec.count > 0) {
        const dx = ec.x / ec.count - ux;
        const dy = ec.y / ec.count - uy;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0) {
          const invD = 1 / Math.sqrt(d2);
          seekX = dx * invD; seekY = dy * invD; seekCount = 1;
        }
      }
    }

    // Apply flocking accumulators
    if (alignCount > 0) {
      const inv = 1 / alignCount;
      ax += (alignVx * inv - uvx) * alignWeight;
      ay += (alignVy * inv - uvy) * alignWeight;
    }
    if (cohCount > 0) {
      const inv = 1 / cohCount;
      ax += (cohX * inv - ux) * cohWeight;
      ay += (cohY * inv - uy) * cohWeight;
    }
    if (seekCount > 0) {
      const inv = 1 / seekCount;
      ax += seekX * inv * seekWeight;
      ay += seekY * inv * seekWeight;
    }

    // Clamp acceleration. Compare against maxAccel² so sqrt only runs when over.
    const aMag2 = ax * ax + ay * ay;
    if (aMag2 > maxAccel2) {
      const k = maxAccel / Math.sqrt(aMag2);
      ax *= k; ay *= k;
    }

    accX[i] = ax;
    accY[i] = ay;

    // Combat: attack nearest enemy within attackRadius
    if (nearestEnemyId !== -1 && nearestEnemyDist2 < attackR2) {
      const dmg = (u.dmg ?? 1) * dt;
      damageBuffer.set(nearestEnemyId, (damageBuffer.get(nearestEnemyId) ?? 0) + dmg);
    }
  }

  // Apply acceleration and integrate
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const maxSpeed = u.speed * speedScale;
    const maxSpeed2 = maxSpeed * maxSpeed;

    u.vx += accX[i] * dt;
    u.vy += accY[i] * dt;

    // Clamp speed. Compare against maxSpeed² so sqrt only runs when over.
    const spd2 = u.vx * u.vx + u.vy * u.vy;
    if (spd2 > maxSpeed2) {
      const k = maxSpeed / Math.sqrt(spd2);
      u.vx *= k; u.vy *= k;
    }

    // Integrate
    u.x += u.vx * dt;
    u.y += u.vy * dt;

    // Bounce off walls
    if (u.x < 0) { u.x = 0; u.vx *= -0.5; }
    else if (u.x > width) { u.x = width; u.vx *= -0.5; }
    if (u.y < 0) { u.y = 0; u.vy *= -0.5; }
    else if (u.y > height) { u.y = height; u.vy *= -0.5; }
  }

  if (stats) stats.accelMs += performance.now() - p2Start;

  // ── Phase 3: hard collision resolution ──────────────────────
  // Forces alone can't guarantee separation when seek weights are high; this
  // runs after integration so it always wins.
  const p3Start = stats ? performance.now() : 0;

  const collRadius = COMBAT_CONFIG.rendering.dotRadius * 2 + 0.5;
  const collRadius2 = collRadius * collRadius;
  const collHash = new SpatialHash<UnitA>(collRadius * 3);
  for (const u of units) collHash.insert(u);

  for (const u of units) {
    for (const n of collHash.queryRadius(u.x, u.y, collRadius)) {
      if (n.id === u.id || n.side === u.side) continue;
      const dx = u.x - n.x;
      const dy = u.y - n.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= collRadius2 || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      // Push u half the overlap away; n's own iteration handles its half.
      // Factor (collRadius - d) * 0.5 / d once.
      const push = (collRadius - d) * 0.5 / d;
      u.x += dx * push;
      u.y += dy * push;
    }
    // Re-clamp after collision nudges
    if (u.x < 0) u.x = 0; else if (u.x > width) u.x = width;
    if (u.y < 0) u.y = 0; else if (u.y > height) u.y = height;
  }

  if (stats) stats.collisionMs += performance.now() - p3Start;

  // ── Phase 4: damage + dead removal + events ─────────────────
  const p4Start = stats ? performance.now() : 0;

  // Apply damage buffer
  const dead: UnitA[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const dmg = damageBuffer.get(u.id);
    if (dmg) {
      u.hp -= dmg;
      if (u.hp <= 0) dead.push(u);
    }
  }

  // Emit kill events and remove dead
  for (const u of dead) {
    events.emit({ type: 'kill', side: u.side, unitType: u.type, x: u.x, y: u.y, t });
  }
  if (dead.length > 0) {
    const deadIds = new Set(dead.map(u => u.id));
    state.units = state.units.filter(u => !deadIds.has(u.id));
  }

  if (stats) stats.damageMs += performance.now() - p4Start;
}
