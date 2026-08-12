/**
 * Combat tuning config.
 *
 * The model is cell-aggregate flocking: cohesion and alignment are averaged
 * over a 3x3 block of grid cells (O(1) per unit) rather than iterated
 * per-neighbor, while separation and combat targeting use a fine-hash query at
 * radius max(separationRadius, attackRadius).
 *
 * Tune ONE value at a time. Watch a small fight (20v20) where individual unit
 * behavior is legible, then sanity-check a big one (500v500+) for emergent blob
 * behavior. Weights interact, so simultaneous changes are hard to reason about.
 */
export const COMBAT_CONFIG = {
	simulation: {
		// ── Separation: short-range "don't crowd me" push ──────────
		// The soft half of collision avoidance — it decelerates the approach
		// smoothly. The hard half is the phase-3 positional pass, which
		// guarantees no overlap regardless of these values.

		// How close (px) before same-side units push apart. Keep at or slightly
		// above unit diameter (dotRadius*2 = 4px). With attackRadius this sets the
		// fine-query radius, the main per-tick cost — bigger costs performance.
		// Range: 4–12.  Lower = tighter packing (mushier crush). Higher = airier.
		separationRadius: 6,

		// Strength of the same-side push. Competes against maxAccel (100), so
		// values near/above maxAccel make separation dominate at contact.
		// Range: 20–80.  Higher = crisper spacing, more "bouncy" crowds.
		separationWeight: 50.0,

		// Enemy push strength. Keep BELOW separationWeight so units can actually
		// close into melee instead of repelling each other across the front.
		// Range: 5–25.  Too high and the two armies never make contact.
		enemySeparationWeight: 10,

		// ── Alignment: match the local crowd's heading (schooling) ──
		// Averaged over the 3x3 aggregate block.
		// Range: 0–2.  0 = no schooling (units steer independently). Higher =
		// more uniform, flock-like flow. Above ~2 it overpowers seek and units
		// mill instead of advancing.
		alignmentWeight: 0.8,

		// ── Cohesion: pull toward the local center of mass ─────────
		// This is what makes units clump into blocks rather than scatter.
		// It's a (positionError * weight) term, and position error can be large
		// (tens of px), so the weight is necessarily small.
		// Range: 0–0.3.  0 = no clumping. Too high = army collapses to a point
		// and stops spreading to fight. 0.05 is gentle; 0.15 is noticeably tighter.
		cohesionWeight: 0.05,

		// Drives the aggregate grid cell size (aggCell = cohesionRadius in simulation.ts).
		// A unit reads a 3x3 block, so the cohesion neighborhood spans ~3x this.
		// Range: 25–80.  Smaller = tighter, more local cohesion AND more grid
		// cells (still cheap). Larger = broader blobs, coarser movement (units may
		// visibly "snap" between cells if this is much larger than the arena/6).
		cohesionRadius: 50,

		// ── Seek: drive toward the enemy ───────────────────────────
		// Read off the aggregate grid — enemy local center of mass if any enemy is
		// in the 3x3 block, else the global enemy centroid. No query.
		// Strength of the advance. With maxAccel=100, any value >=100 means seek
		// saturates the acceleration clamp and units beeline — cohesion/alignment
		// then barely shape the approach. Lower it to let formation behavior show.
		// Range: 20–100.  Try 40–60 if you want units to advance AS a group rather
		// than as a sprint of individuals.
		seekWeight: 100.0,

		// ── Combat ─────────────────────────────────────────────────
		// Melee reach (px). A unit damages the nearest enemy within this range.
		// Together with separationRadius this sets the fine-query radius, so it's
		// a performance knob too: bigger = more neighbors per query = slower.
		// Range: 5–15.  Should be >= separationRadius or units can't reach enemies
		// they're being pushed away from.
		attackRadius: 8,

		// ── Kinematics ─────────────────────────────────────────────
		// Max acceleration magnitude (px/s²-ish in engine units). Controls how
		// sharply units can change direction — turn responsiveness.
		// Range: 50–300.  Higher = snappier, more agile. Lower = ponderous,
		// wider turning arcs (can look more "weighty" for big units).
		maxAccel: 100,

		// Multiplier on a unit's `speed` stat to get max velocity. speed=1 with
		// scale=20 → 20 px/s. This is the master movement-speed dial.
		// Range: 10–60.  Tune so a fight lasts a satisfying number of seconds at
		// combatSpeedMultiplier=1. Higher = faster, more frantic battles.
		speedScale: 20,

		// Floor on the distance used in the separation falloff, which goes as
		// 1/d and would blow up at contact. Range: 0.25–1.  Lower = harsher
		// shove when two units overlap; higher = softer but mushier crowds.
		separationMinDistance: 0.5,

		// Damage per second for a unit whose `dmg` stat is missing. A fallback
		// only — every real unit carries a stat from `UNIT_STAT_CONFIG`.
		defaultDamage: 1,

		// Velocity retained when a unit hits a wall, as a fraction, negated.
		// Range: 0–0.8.  0 = units stick to walls, higher = livelier rebound.
		wallRestitution: 0.5,
	},

	collision: {
		// Hard-collision spacing as a multiple of `rendering.dotRadius`, plus a
		// small margin, so dots resolve just shy of visually overlapping.
		// Range: 1.5–3.  Higher = looser packing, fewer units in contact.
		radiusPerDot: 2,
		radiusMargin: 0.5,

		// Spatial-hash cell size as a multiple of the collision radius. Purely a
		// performance knob: smaller = more cells, more overhead, fewer candidates
		// per query. Measure with `bunx tsx src/combat/benchmark.ts` before moving it.
		cellSizeMultiple: 3,

		// Fraction of an overlap each unit is pushed out per pass. 0.5 splits the
		// correction evenly between the pair. Range: 0.25–0.5.  Higher = stiffer
		// separation but more jitter.
		correction: 0.5,

		// Below this squared distance two units count as coincident and are left
		// alone, since the push direction would be meaningless.
		minSeparation2: 0.0001,
	},

	rendering: {
		// Unit dot radius (px). Visual size; also feeds the hard-collision spacing
		// (collRadius = dotRadius*2 + 0.5). Bigger dots = more spread-out crowds.
		dotRadius: 2,

		// How long a death-flash marker lingers (ms).
		deathFlashMs: 150,

		// Trail persistence for the motion-blur effect (lower = longer trails).
		trailAlpha: 0.05,

		backgroundColor: "#0A0A0F",
	},
};
