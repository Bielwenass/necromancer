import type { CatchupState } from "../../../game/useGameLifecycle";
import { RESOURCE_KEYS, resourceMeta } from "../../resources";
import { Modal } from "../common/Modal";

interface CatchupOverlayProps {
	catchup: CatchupState;
	onDismiss: () => void;
}

/**
 * Shown while the offline catchup replays time away from the game. It is
 * undismissable until `done` — closing early would strand a half-applied
 * simulation, so no `onClose` is handed to the modal before then.
 */
export function CatchupOverlay({ catchup, onDismiss }: CatchupOverlayProps) {
	const gains = RESOURCE_KEYS.filter((key) => catchup.stats.gained[key] > 0);

	return (
		<Modal
			label="Offline progress"
			onClose={catchup.done ? onDismiss : undefined}
			backdropClassName="bg-[rgba(0,0,0,0.88)]"
			zClassName="z-[500]"
			className="flex-col"
		>
			<div className="font-display text-sm text-bone tracking-[0.22em] mb-3">
				{catchup.done ? "CAUGHT UP" : "CATCHING UP..."}
			</div>

			<div className="w-[360px] h-0.5 bg-rule mb-6">
				<div
					className="h-full bg-bone transition-[width] duration-100"
					style={{ width: `${catchup.progress * 100}%` }}
				/>
			</div>

			<div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-6">
				{gains.map((key) => (
					<div key={key} className="text-center min-w-14">
						<div className="mono text-md text-bone">
							+{catchup.stats.gained[key].toLocaleString()}
						</div>
						<div className="mono text-xs text-dim tracking-wider mt-0.5 uppercase">
							{resourceMeta(key).label}
						</div>
					</div>
				))}
			</div>

			<div
				className={`mono text-xs text-dim tracking-wide ${catchup.done ? "mb-6" : ""}`}
			>
				{catchup.stats.eventsProcessed} events processed
			</div>

			{catchup.done && (
				<button
					type="button"
					onClick={onDismiss}
					className="px-7 py-2 border border-bone text-bone bg-transparent cursor-pointer font-display text-xs tracking-[0.22em]"
				>
					CONTINUE
				</button>
			)}
		</Modal>
	);
}
