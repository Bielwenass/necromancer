/**
 * Combat tuning. One pair walk carries separation and hard contact; a target is
 * held by id and only searched for when nobody is in contact, over a coarse grid
 * of enemy cell counts. Tune ONE value at a time. Watch a 20v20 for individual
 * behaviour, then a 500v500 for emergent blobbing.
 */
export const COMBAT_CONFIG = {
	simulation: {
		// How far the enemy search rings outward, in `steerCellSize` cells. Wide enough
		// to span the arena or a unit steers by the global centroid until contact; the
		// search is priced per cell, not per unit, so reaching further is cheap.
		nearestMaxRings: 10,

		// Px at which units push apart, and the walk radius: the whole per-tick cost
		// scales with its square. Range 4–12.
		separationRadius: 5,

		// Range 20–80, competing against `maxAccel`.
		separationWeight: 150,

		// Enemy push. Range 5–25, below `separationWeight` or the armies never close.
		enemySeparationWeight: 150,

		// Cell size of the steering grid. It sets both how near "nearest enemy" really
		// is and how many units an acquisition scans, so smaller is sharper and
		// cheaper until the ring count needed to cross the arena tells. Range 16–50.
		steerCellSize: 25,

		// Acceleration toward the held enemy, the centre of its cell while none is
		// close enough to pick, or the global centroid when the rings come up empty.
		// Capped at `maxAccel`, past which a unit is already turning as hard as it
		// can and the dial does nothing. Range 20–`maxAccel`; at a quarter of it the
		// armies close so slowly a fight can time out.
		seekWeight: 50,

		// Share of `seekWeight` kept once the target is inside reach, so the range is
		// the whole of 0–1. Range 0–0.3: by 0.8 a unit in melee carries half again
		// its speed and sits twice as deep in contact, and past 1 it drives through
		// the line it is fighting.
		engagedSeekScale: 0.1,

		// Velocity drag (1/s) while engaged, the only drag term. Range 4–16.
		engagedDamping: 8,

		// Strike range (px) for a unit type that declares no `reach`. The walk does not
		// price it, so widening it is free; it is what holds a target in reach through
		// the jostle. Range 5–15, and >= `separationRadius`.
		attackRadius: 8,

		// Px within which a unit picks one enemy out of the crowd, roughly the point
		// of arriving in the enemy's cell. Beyond it a whole cell steers at that cell
		// and arrives as a body; committing at range fans a charge into as many
		// threads as there are enemies and hands the defender easy kills. Range 8–25.
		commitRadius: 16,

		// Cost multiplier on an enemy cell lying behind the unit, so a line does not
		// turn back through itself for a marginally closer pocket. 1 disables.
		reverseBias: 3,

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

		// Velocity retained off a wall, negated. Range 0–0.8; 0 holds the line there.
		wallRestitution: 0,
	},

	// Behaviour of the relic-granted modifiers; magnitudes roll in `data/relics.ts`.
	modifiers: {
		// `vanguard`'s window from the first tick. Range 3000–12000, several multiples
		// of `attackIntervalMs` or spawn phase decides the bonus.
		openingWindowMs: 6000,

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

		// Total units on the field at which the footprint is full size. Past it the
		// radius falls by the inverse square root, holding area per unit roughly
		// constant so a crowded field stays cheap.
		radiusScaleRefCount: 500,

		// Floor on that shrink, below which dots stop resolving apart. Range 0.3–1.
		radiusScaleMin: 0.4,

		// Share of an overlap booked as a correction. Every contact books its own and
		// they land together, so a unit in several is pushed by all of them: this sits
		// lower than a figure applied one pair at a time. Range 0.2–0.5.
		correction: 0.3,

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

		backgroundColor: "#0A0A0F",
	},
};
