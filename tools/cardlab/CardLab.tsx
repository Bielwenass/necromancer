import { useCallback, useEffect, useState } from "react";
import { RARITY_ORDER } from "../../src/game/data/relics";
import { rollRelic } from "../../src/game/rules/relics";
import { CardLabControls } from "./CardLabControls";
import { CardLabStage } from "./CardLabStage";
import { INITIAL_LAB, type LabState } from "./labControls";

/**
 * Card viewer on its own page. Rolls throwaway relics and drives `RelicCard`
 * straight from the panel, so the card's visuals can be tuned without pulling from
 * the store.
 */
export function CardLab() {
	const [state, setState] = useState<LabState>(INITIAL_LAB);
	const [runId, setRunId] = useState(0);

	const roll = useCallback(
		() =>
			(state.allRarities ? [...RARITY_ORDER] : [state.rarity]).map((r) =>
				rollRelic(state.baseId, r),
			),
		[state.allRarities, state.rarity, state.baseId],
	);

	const [relics, setRelics] = useState(roll);
	useEffect(() => setRelics(roll()), [roll]);

	return (
		<div className="necro flex">
			<CardLabControls
				state={state}
				onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
				onReroll={() => setRelics(roll())}
				onReplay={() => setRunId((n) => n + 1)}
			/>

			<div className="flex-1 flex flex-col min-w-0">
				<header className="flex items-center px-6 h-14 border-b border-rule shrink-0">
					<span className="font-display text-sm text-coin tracking-[0.3em] uppercase">
						Card Lab
					</span>
				</header>

				<CardLabStage state={state} relics={relics} runId={runId} />
			</div>
		</div>
	);
}
