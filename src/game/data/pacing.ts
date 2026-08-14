/**
 * Every clock in the game. Offline catchup reproduces the live simulation
 * exactly, so a duplicated constant drifting apart would pay the player
 * differently online and offline.
 */

export const TICK_MS = 100;

/** Every per-second rate the UI shows goes through this. */
export const TICKS_PER_SECOND = 1000 / TICK_MS;

/** Fixed timestep the combat engine is advanced by */
export const ENGINE_DT = 16;

/** 2 minutes of real time per in-game day. */
export const TICKS_PER_DAY = 1200;

export const TICKS_PER_AUTOSAVE = 50;

/** How far offline catchup will re-simulate. Time beyond this is forfeited. */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

/** Hidden time past which a return runs catchup; below it, plain resume. */
export const CATCHUP_THRESHOLD_MS = 2000;

/**
 * How long a fight may run before the engine decides it, in sim time. A game
 * rule: the engine calls it for whichever side has the larger share of its
 * muster standing, so a squad winning on points is paid.
 */
export const MAX_FIGHT_MS = 10 * 60 * 1000;

export const MAX_HEADLESS_TICKS = MAX_FIGHT_MS / ENGINE_DT;
