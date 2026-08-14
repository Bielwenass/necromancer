/**
 * Every clock in the game in one place. Offline catchup reproduces the live
 * simulation exactly, so two copies of one of these drifting apart would pay the
 * player differently online and offline.
 */

/** One simulation tick. The store's accumulator drains exact steps of this. */
export const TICK_MS = 100;

/** Every per-second rate the UI shows goes through this. */
export const TICKS_PER_SECOND = 1000 / TICK_MS;

/** Fixed timestep the combat engine is advanced by, live and headless alike. */
export const ENGINE_DT = 16;

/** 2 minutes of real time per in-game day. */
export const TICKS_PER_DAY = 1200;

/** Autosave cadence, in ticks. */
export const TICKS_PER_AUTOSAVE = 50;

/** How far offline catchup will re-simulate. Time beyond this is forfeited. */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

/**
 * How long the tab must be hidden before returning to it runs catchup rather
 * than simply resuming. Below this the drift is not worth an overlay.
 */
export const CATCHUP_THRESHOLD_MS = 2000;

/**
 * How long a single fight may run before the engine decides it, in sim time. A
 * game rule rather than a safety valve: the engine calls it for whichever side
 * has the larger share of its muster still standing, so a squad winning on
 * points is paid rather than wiped.
 */
export const MAX_FIGHT_MS = 10 * 60 * 1000;

/** The same cap in engine steps, for loops that drive a fight themselves. */
export const MAX_HEADLESS_TICKS = MAX_FIGHT_MS / ENGINE_DT;
