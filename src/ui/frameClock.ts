/**
 * One `requestAnimationFrame` for every subscriber on the page.
 *
 * A per-component loop costs a callback and a style flush each; a grid of relic
 * cards pays that N times over. Here every `read` runs before the first `write`,
 * so a frame that measures layout or computed style does it once for all of them
 * instead of thrashing read → write → read.
 */
export interface FrameStep {
	/** Measure phase: read computed style or layout here, never write. */
	read?: (now: number) => void;
	write: (now: number) => void;
}

const steps = new Set<FrameStep>();
let raf = 0;

function frame(now: number) {
	raf = requestAnimationFrame(frame);
	for (const step of steps) step.read?.(now);
	for (const step of steps) step.write(now);
}

/** Subscribes until the returned function is called. The loop stops when empty. */
export function onFrame(step: FrameStep): () => void {
	steps.add(step);
	if (!raf) raf = requestAnimationFrame(frame);
	return () => {
		steps.delete(step);
		if (!steps.size && raf) {
			cancelAnimationFrame(raf);
			raf = 0;
		}
	};
}
