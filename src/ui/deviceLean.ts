/**
 * How far the device is tilted, as a pose in the same -0.5..0.5 the pointer gives
 * a card, so a phone leaning replaces a mouse hovering.
 *
 * The first reading is the rest position, so any comfortable holding angle starts
 * centred. iOS gates the event behind `requestPermission()` on a user gesture and
 * is left to fall back to idle drift.
 */

/** Degrees of lean that reach a full pose. */
const RANGE = 26;
/** Per-event approach to the new reading; orientation samples are noisy. */
const SMOOTH = 0.12;

let lean: { x: number; y: number } | null = null;
let rest: { beta: number; gamma: number } | null = null;
let subscribers = 0;

const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));

function onOrientation(e: DeviceOrientationEvent) {
	if (e.beta === null || e.gamma === null) return;
	if (!rest) rest = { beta: e.beta, gamma: e.gamma };
	const x = clamp((e.gamma - rest.gamma) / RANGE);
	const y = clamp((e.beta - rest.beta) / RANGE);
	lean = lean
		? { x: lean.x + (x - lean.x) * SMOOTH, y: lean.y + (y - lean.y) * SMOOTH }
		: { x, y };
}

/** Ref-counted: the listener lives only while cards are on screen. */
export function subscribeLean(): () => void {
	if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
		return () => {};
	}
	if (subscribers === 0) {
		window.addEventListener("deviceorientation", onOrientation);
	}
	subscribers += 1;
	return () => {
		subscribers -= 1;
		if (subscribers === 0) {
			window.removeEventListener("deviceorientation", onOrientation);
			lean = null;
			rest = null;
		}
	};
}

/** Null until the device has actually reported an orientation. */
export function getLean() {
	return lean;
}
