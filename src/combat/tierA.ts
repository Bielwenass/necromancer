import type { UnitA, Side, SideConfig } from './types';
import type { EventQueue } from './events';
import { COMBAT_CONFIG } from './config';
import { SpatialHash } from './spatialHash';

export type TierAState = { units: UnitA[] };

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
): void {
  const cfg = COMBAT_CONFIG.tierA;
  const units = state.units;
  if (units.length === 0) return;

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

  const damageBuffer = new Map<number, number>();

  // Accelerations to accumulate
  const accX = new Float32Array(units.length);
  const accY = new Float32Array(units.length);

  for (let i = 0; i < units.length; i++) {
    const u = units[i];

    // Query neighbors — wide enough for cohesion and local seek
    const neighbors = hash.queryRadius(u.x, u.y, cfg.cohesionRadius);

    // Direct-accumulation acceleration (separation applied inline, not averaged)
    let ax = 0, ay = 0;
    let alignVx = 0, alignVy = 0, alignCount = 0;
    let cohX = 0, cohY = 0, cohCount = 0;
    let seekX = 0, seekY = 0, seekCount = 0;
    let nearestEnemyId = -1;
    let nearestEnemyDist2 = Infinity;

    for (const n of neighbors) {
      if (n.id === u.id) continue;
      const dx = n.x - u.x;
      const dy = n.y - u.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);

      if (n.side === u.side) {
        // Separation: inverse-distance so force spikes when very close
        if (d < cfg.separationRadius && d > 0) {
          const strength = cfg.separationRadius / Math.max(d, 0.5) - 1;
          ax -= (dx / d) * strength * cfg.separationWeight;
          ay -= (dy / d) * strength * cfg.separationWeight;
        }
        if (d < cfg.alignmentRadius) {
          alignVx += n.vx; alignVy += n.vy; alignCount++;
        }
        if (d < cfg.cohesionRadius) {
          cohX += n.x; cohY += n.y; cohCount++;
        }
      } else {
        // Enemy separation: weaker push — slows penetration without blocking combat
        if (d < cfg.separationRadius && d > 0) {
          const strength = cfg.separationRadius / Math.max(d, 0.5) - 1;
          ax -= (dx / d) * strength * cfg.enemySeparationWeight;
          ay -= (dy / d) * strength * cfg.enemySeparationWeight;
        }
        // Local seek
        if (d < cfg.seekRadius && d > 0) {
          seekX += dx / d; seekY += dy / d; seekCount++;
        }
        if (d2 < nearestEnemyDist2) {
          nearestEnemyDist2 = d2; nearestEnemyId = n.id;
        }
      }
    }

    // Widen seek search if no enemies found in cohesion radius
    if (seekCount === 0) {
      const enemyNeighbors = hash.queryRadius(u.x, u.y, cfg.seekRadius);
      for (const n of enemyNeighbors) {
        if (n.side === u.side) continue;
        const dx = n.x - u.x;
        const dy = n.y - u.y;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2);
        if (d > 0) { seekX += dx / d; seekY += dy / d; }
        seekCount++;
        if (d2 < nearestEnemyDist2) { nearestEnemyDist2 = d2; nearestEnemyId = n.id; }
      }
    }

    // Global march: if still no visible enemies, steer toward enemy centroid
    if (seekCount === 0) {
      const enemySide: Side = u.side === 'a' ? 'b' : 'a';
      const ec = centroid[enemySide];
      if (ec.count > 0) {
        const dx = ec.x / ec.count - u.x;
        const dy = ec.y / ec.count - u.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0) { seekX = dx / d; seekY = dy / d; seekCount = 1; }
      }
    }

    if (alignCount > 0) { ax += (alignVx / alignCount - u.vx) * cfg.alignmentWeight; ay += (alignVy / alignCount - u.vy) * cfg.alignmentWeight; }
    if (cohCount > 0) { ax += (cohX / cohCount - u.x) * cfg.cohesionWeight; ay += (cohY / cohCount - u.y) * cfg.cohesionWeight; }
    if (seekCount > 0) { ax += (seekX / seekCount) * cfg.seekWeight; ay += (seekY / seekCount) * cfg.seekWeight; }

    // Clamp acceleration
    const aMag = Math.sqrt(ax * ax + ay * ay);
    if (aMag > cfg.maxAccel) { ax = ax / aMag * cfg.maxAccel; ay = ay / aMag * cfg.maxAccel; }

    accX[i] = ax;
    accY[i] = ay;

    // Combat: attack nearest enemy within attackRadius
    if (nearestEnemyId !== -1 && nearestEnemyDist2 < cfg.attackRadius * cfg.attackRadius) {
      const dmg = (u.dmg ?? 1) * dt;
      damageBuffer.set(nearestEnemyId, (damageBuffer.get(nearestEnemyId) ?? 0) + dmg);
    }
  }

  // Apply acceleration and integrate
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const maxSpeed = u.speed * cfg.speedScale;

    u.vx += accX[i] * dt;
    u.vy += accY[i] * dt;

    // Clamp speed
    const spd = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
    if (spd > maxSpeed) { u.vx = u.vx / spd * maxSpeed; u.vy = u.vy / spd * maxSpeed; }

    // Integrate
    u.x += u.vx * dt;
    u.y += u.vy * dt;

    // Bounce off walls
    if (u.x < 0) { u.x = 0; u.vx *= -0.5; }
    if (u.x > width) { u.x = width; u.vx *= -0.5; }
    if (u.y < 0) { u.y = 0; u.vy *= -0.5; }
    if (u.y > height) { u.y = height; u.vy *= -0.5; }
  }

  // Hard collision resolution — push overlapping enemy pairs apart.
  // Forces alone can't guarantee separation when seek weights are high; this
  // runs after integration so it always wins.
  const collRadius = COMBAT_CONFIG.rendering.dotRadius * 2 + 0.5;
  const collHash = new SpatialHash<UnitA>(collRadius * 3);
  for (const u of units) collHash.insert(u);

  for (const u of units) {
    for (const n of collHash.queryRadius(u.x, u.y, collRadius)) {
      if (n.id === u.id || n.side === u.side) continue;
      const dx = u.x - n.x;
      const dy = u.y - n.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= collRadius * collRadius || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      // Push u half the overlap away; n's own iteration handles its half
      const push = (collRadius - d) * 0.5;
      u.x += (dx / d) * push;
      u.y += (dy / d) * push;
    }
    // Re-clamp after collision nudges
    if (u.x < 0) u.x = 0; else if (u.x > width) u.x = width;
    if (u.y < 0) u.y = 0; else if (u.y > height) u.y = height;
  }

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
}
