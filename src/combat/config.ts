/**
 * Combat tuning. Cell-aggregate flocking: cohesion and alignment average over a
 * 3x3 block of grid cells; separation and targeting use a fine-hash query at
 * `max(separationRadius, attackRadius)`. Tune ONE value at a time. Watch a 20v20
 * for individual behaviour, then a 500v500 for emergent blobbing.
 */
export const COMBAT_CONFIG = {
	simulation: {
		// Px at which same-side units push apart. With `attackRadius` it sets the
		// fine-query radius, the main per-tick cost. Range 4–12.
		separationRadius: 6,

		// Range 20–80, competing against `maxAccel`.
		separationWeight: 50.0,

		// Enemy push. Range 5–25, below `separationWeight` or the armies never close.
		enemySeparationWeight: 10,

		// Local crowd's heading. Range 0–2. Above ~2 it overpowers seek and units mill.
		alignmentWeight: 0.8,

		// Pull toward the local center of mass.
		// Range 0–0.3, multiplying a position error that runs to tens of px.
		cohesionWeight: 0.05,

		// Aggregate cell size; a unit's 3x3 block spans ~3x this. Range 25–80.
		cohesionRadius: 50,

		// Toward the enemy local COM, or the global centroid when the 3x3 block holds
		// none. Range 20–100; at `maxAccel` units beeline.
		seekWeight: 100.0,

		// Share of `seekWeight` kept once an enemy is inside `attackRadius`. Range
		// 0–0.3; above that a unit in melee jitters against the positional pass.
		engagedSeekScale: 0.1,

		// Velocity drag (1/s) while engaged, the only drag term. Range 4–16.
		engagedDamping: 8,

		// Melee reach (px). Range 5–15, and >= `separationRadius`.
		attackRadius: 6,

		// Ms between blows. A blow deals `dmg × interval` at once, so overkill caps a
		// farmed tomb at one kill per unit per interval. Range 300–1500.
		attackIntervalMs: 800,

		// Turn responsiveness. Range 50–300.
		maxAccel: 80,

		// Multiplier on `speed` for max velocity; the master movement dial. 10–60.
		speedScale: 15,

		// Floor on the 1/d separation falloff. Range 0.25–1.
		separationMinDistance: 0.5,

		defaultDamage: 1,

		// Velocity retained off a wall, negated. Range 0–0.8.
		wallRestitution: 0.5,
	},

	// Behaviour of the relic-granted modifiers; magnitudes roll in `data/relics.ts`.
	modifiers: {
		// `vanguard`'s window from the first tick. Range 3000–12000, several multiples
		// of `attackIntervalMs` or spawn phase decides the bonus.
		openingWindowMs: 6000,

		// `aura` reach (px), widening the fine query in fights carrying one. Range
		// 8–20, within ~2x `attackRadius`.
		auraRadius: 14,

		// Share of starting count a side falls below before `lastStand` pays. 0.1–0.35.
		lastStandThreshold: 0.2,

		// Ceiling on the local advantage `overwhelm` scales with, so a lone straggler
		// hands a swarm no unbounded multiplier. Range 1–4.
		overwhelmCap: 2,
	},

	collision: {
		// Multiple of `rendering.dotRadius` plus a margin, so dots resolve just shy of
		// overlapping. Range 1.5–3.
		radiusPerDot: 2,
		radiusMargin: 0.5,

		// Hash cell size as a multiple of the collision radius. Benchmark before moving.
		cellSizeMultiple: 3,

		// Share of an overlap pushed out per pass. Range 0.25–0.5; higher jitters more.
		correction: 0.5,

		// Share of a contact's closing normal velocity absorbed. Range 0–1; 0 buzzes,
		// 1 feels glued.
		velocityAbsorb: 0.5,

		// Squared distance below which two units count as coincident.
		minSeparation2: 0.0001,
	},

	rendering: {
		// Also feeds the hard-collision spacing.
		dotRadius: 2,

		deathFlashMs: 150,

		// Pause on the final frame before the looping replay restarts (ms).
		replayRestartDelayMs: 2000,

		// Motion-blur trail persistence; lower = longer trails.
		trailAlpha: 0.05,

		backgroundColor: "#0A0A0F",
	},
};
