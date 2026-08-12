/**
 * Every clock in the game in one place.
 *
 * The offline catchup reproduces the live simulation exactly, so a divergence
 * between two copies of one of these is not a cosmetic bug: it pays
 * the player differently online and offline.
 */

/** Length of one simulation tick. The store's accumulator drains exact steps of this. */
export const TICK_MS = 100;

/**
 * Derived from `TICK_MS`. Every per-tick rate the UI shows per second goes through
 * this, as does the garden's bones/sec to bones/tick conversion.
 */
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
 * Safety cap on a single headless fight (~5 minutes of sim time). A fight that
 * hits this is treated as decided so catchup can't hang on a stalemate.
 */
export const MAX_HEADLESS_TICKS = 20000;
