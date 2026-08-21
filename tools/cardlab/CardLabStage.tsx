import type { Relic } from "../../src/game/types";
import { RelicCard } from "../../src/ui/components/reliquary/RelicCard";
import type { LabState } from "./labControls";

interface CardLabStageProps {
	state: LabState;
	relics: Relic[];
	/** Bumped to remount the cards, which restarts the reveal from face-down. */
	runId: number;
}

export function CardLabStage({ state, relics, runId }: CardLabStageProps) {
	// `copies` repeats the roll to stress the drift and the reveal at pull and
	// inventory counts. Each copy carries its own key, so the cards are distinct
	// components rather than one card drawn many times.
	const shown = Array.from({ length: state.copies }, (_, copy) =>
		relics.map((relic) => ({ relic, key: `${relic.id}-${copy}` })),
	).flat();
	return (
		<div className="flex-1 overflow-auto flex flex-wrap content-start items-start justify-center gap-6 p-10">
			{shown.map(({ relic, key }, i) => (
				<div key={`${key}-${runId}`} style={{ width: state.cardWidth }}>
					<RelicCard
						relic={relic}
						variant={state.variant}
						face={state.view === "back" ? "back" : "front"}
						tweaks={state.tweaks}
						revealing={state.view === "reveal"}
						revealDelay={(i % relics.length) * state.stagger}
					/>
					<div className="mt-2 text-center mono text-[10px] tracking-[0.18em] uppercase text-dim">
						{relic.rarity} · q{relic.quality}
					</div>
				</div>
			))}
		</div>
	);
}
