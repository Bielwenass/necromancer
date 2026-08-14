import { expect, test } from "bun:test";
import { accrueFreePulls } from "./gacha";

const start = { freePulls: 0, freePullTicks: 0 };

// Catchup batches a whole span into one call, so the two must agree exactly.
test("free pulls accrue identically stepwise and batched", () => {
	let stepwise = start;
	for (let i = 0; i < 2500; i++) {
		stepwise = accrueFreePulls(stepwise, true, 1);
	}
	expect(stepwise).toEqual(accrueFreePulls(start, true, 2500));
});

test("the Phylactery pays nothing while unbought", () => {
	expect(accrueFreePulls(start, false, 100_000).freePulls).toBe(0);
});
