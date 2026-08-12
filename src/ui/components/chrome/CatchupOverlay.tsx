import type { CatchupState } from "../../../game/useGameLifecycle";
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
	const gains = [
		{ label: "BONES", value: catchup.stats.bonesGained },
		{ label: "SOULS", value: catchup.stats.soulsGained },
	];

	return (
		<Modal
			label="Offline progress"
			onClose={catchup.done ? onDismiss : undefined}
			backdropClassName="bg-[rgba(0,0,0,0.88)]"
			zClassName="z-[500]"
			className="flex-col"
		>
			<div className="font-display text-sm text-bone tracking-[0.22em] mb-[18px]">
				{catchup.done ? "CAUGHT UP" : "CATCHING UP..."}
			</div>

			{/* Borderless and on a lighter track than `Meter` — deliberately not
			    that primitive, since this bar is chrome rather than a game stat. */}
			<div className="w-60 h-0.5 bg-rule mb-6">
				<div
					className="h-full bg-bone transition-[width] duration-100"
					style={{ width: `${catchup.progress * 100}%` }}
				/>
			</div>

			<div className="flex gap-6 mb-[14px]">
				{gains.map(({ label, value }) => (
					<div key={label} className="text-center min-w-[52px]">
						<div className="mono text-sm text-bone">
							+{value.toLocaleString()}
						</div>
						<div className="mono text-[9px] text-dim tracking-[0.1em] mt-[3px]">
							{label}
						</div>
					</div>
				))}
			</div>

			<div
				className={`mono text-[10px] text-dim tracking-[0.08em] ${catchup.done ? "mb-6" : ""}`}
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
