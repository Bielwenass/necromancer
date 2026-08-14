/**
 * Combat tuning. The model is cell-aggregate flocking: cohesion and alignment
 * are averaged over a 3x3 block of grid cells, while separation and combat
 * targeting use a fine-hash query at `max(separationRadius, attackRadius)`.
 *
 * Tune ONE value at a time — weights interact. Watch a 20v20, where individual
 * behaviour is legible, then check a 500v500 for emergent blobbing.
 */
export const COMBAT_CONFIG = {
	simulation: {
		// ── Separation: short-range "don't crowd me" push ──────────
		// The soft half of collision avoidance; the phase-3 positional pass is the
		// hard half and guarantees no overlap whatever these say.

		// How close (px) before same-side units push apart. With `attackRadius`
		// this sets the fine-query radius, the main per-tick cost.
		// Range: 4–12. Lower = tighter packing, higher = airier.
		separationRadius: 6,

		// Competes against `maxAccel`, so values near it make separation dominate
		// at contact. Range: 20–80. Higher = crisper spacing, bouncier crowds.
		separationWeight: 50.0,

		// Enemy push. Keep BELOW `separationWeight` or the armies never close.
		// Range: 5–25.
		enemySeparationWeight: 10,

		// ── Alignment: match the local crowd's heading ─────────────
		// Range: 0–2. 0 = units steer independently; above ~2 it overpowers seek
		// and they mill instead of advancing.
		alignmentWeight: 0.8,

		// ── Cohesion: pull toward the local center of mass ─────────
		// A `positionError × weight` term, and position error runs to tens of px,
		// so the weight is necessarily small. Range: 0–0.3. Too high and the army
		// collapses to a point instead of spreading to fight.
		cohesionWeight: 0.05,

		// Drives the aggregate grid cell size; a unit reads a 3x3 block, so the
		// neighbourhood spans ~3x this. Range: 25–80. Much larger than arena/6 and
		// units visibly snap between cells.
		cohesionRadius: 50,

		// ── Seek: drive toward the enemy ───────────────────────────
		// Read off the aggregate grid — the enemy local center of mass, or the
		// global centroid when the 3x3 block holds none. Range: 20–100. At or above
		// `maxAccel` seek saturates the clamp and units beeline; 40–60 lets them
		// advance as a group.
		seekWeight: 100.0,

		// ── Combat ─────────────────────────────────────────────────
		// Melee reach (px). Also a performance knob, via the fine-query radius.
		// Range: 5–15, and >= `separationRadius` or units can't reach the enemies
		// they are being pushed away from.
		attackRadius: 6,

		// Time between a unit's blows (ms). It deals `dmg × interval` in one burst
		// rather than `dmg × dt` per tick, so average DPS is unchanged — this is a
		// granularity dial. What it buys is overkill: 400 damage on a 5 HP target
		// wastes 395, so a farmed tomb settles at one kill per unit per interval
		// instead of collapsing into an instant win.
		//
		// Range: 300–1500, and well under `modifiers.openingWindowMs` or a
		// `vanguard` blow lands by spawn phase rather than by anything the player
		// did.
		attackIntervalMs: 800,

		// ── Kinematics ─────────────────────────────────────────────
		// Max acceleration magnitude — turn responsiveness. Range: 50–300. Lower =
		// ponderous, wider arcs.
		maxAccel: 80,

		// Multiplier on a unit's `speed` stat for max velocity; the master movement
		// dial. Range: 10–60. Tune so a fight lasts a satisfying number of seconds
		// at `combatSpeedMultiplier` 1.
		speedScale: 15,

		// Floor on the distance in the separation falloff, which goes as 1/d and
		// would blow up at contact. Range: 0.25–1.
		separationMinDistance: 0.5,

		// Fallback for a unit whose `dmg` stat is missing; every real unit carries
		// one from `UNIT_STAT_CONFIG`.
		defaultDamage: 1,

		// Velocity retained off a wall, as a fraction, negated. Range: 0–0.8.
		wallRestitution: 0.5,
	},

	// ── Modifiers ────────────────────────────────────────────────
	// How the relic-granted combat modifiers behave; their magnitudes are rolled
	// and live in `game/data/relics.ts`. None costs anything for a unit that
	// doesn't carry the modifier.
	modifiers: {
		// How long the `vanguard` bonus lasts, from the fight's first tick. Fights
		// run 15–30s, so this is the opening exchange; stretched past a fight's
		// length it is just flat damage. Range: 3000–12000, and several multiples
		// of `simulation.attackIntervalMs` — blows are discrete and scattered at
		// spawn, so a narrow window decides the bonus by spawn phase.
		openingWindowMs: 6000,

		// Reach of the `aura` modifier (px). The one modifier with a performance
		// cost: it widens the fine query, but only in fights where a unit carries
		// one. Range: 8–20, within ~2x `attackRadius` or the query pulls in the
		// whole crush.
		auraRadius: 14,

		// Share of its starting count a side must fall below before `lastStand`
		// pays. Range: 0.1–0.35.
		lastStandThreshold: 0.2,

		// Ceiling on the local numerical advantage `overwhelm` scales with, in
		// multiples of the nearby enemy count. Without it a lone straggler facing a
		// swarm hands that swarm an unbounded multiplier. Range: 1–4.
		overwhelmCap: 2,
	},

	collision: {
		// Hard-collision spacing as a multiple of `rendering.dotRadius` plus a
		// margin, so dots resolve just shy of overlapping. Range: 1.5–3.
		radiusPerDot: 2,
		radiusMargin: 0.5,

		// Spatial-hash cell size as a multiple of the collision radius. Purely a
		// performance knob — measure with the benchmark before moving it.
		cellSizeMultiple: 3,

		// Fraction of an overlap each unit is pushed out per pass; 0.5 splits the
		// correction evenly. Range: 0.25–0.5. Higher = stiffer but more jitter.
		correction: 0.5,

		// Below this squared distance two units count as coincident and are left
		// alone, since the push direction would be meaningless.
		minSeparation2: 0.0001,
	},

	rendering: {
		// Unit dot radius (px). Also feeds the hard-collision spacing.
		dotRadius: 2,

		// How long a death-flash marker lingers (ms).
		deathFlashMs: 150,

		// Pause on the final frame before the looping replay restarts (ms).
		replayRestartDelayMs: 2000,

		// Motion-blur trail persistence; lower = longer trails.
		trailAlpha: 0.05,

		backgroundColor: "#0A0A0F",
	},
};
