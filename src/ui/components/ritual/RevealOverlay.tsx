import { useRef, useState } from "react";
import type { Relic } from "../../../game/types";
import { Modal } from "../common/Modal";
import { RelicCard } from "../reliquary/RelicCard";

const STAGGER_MS = 500;

export function RevealOverlay({
	relics,
	onClose,
}: {
	relics: Relic[];
	onClose: () => void;
}) {
	const [skipped, setSkipped] = useState(false);
	const completedRef = useRef(0);
	const [allRevealed, setAllRevealed] = useState(false);

	const onRevealComplete = () => {
		completedRef.current += 1;
		if (completedRef.current >= relics.length) setAllRevealed(true);
	};

	const skipAll = () => {
		setSkipped(true);
		setAllRevealed(true);
	};

	return (
		// Only dismissable once every card has turned — closing mid-reveal would
		// skip cards the player never saw.
		<Modal
			label="Ritual results"
			onClose={allRevealed ? onClose : undefined}
			backdropClassName="bg-[rgba(0,0,0,0.85)]"
			zClassName="z-[200]"
			className="flex-col max-md:overflow-y-auto max-md:justify-start max-md:py-8"
		>
			{/* Ray burst */}
			<svg
				aria-hidden="true"
				className="absolute inset-0 pointer-events-none"
				width="100%"
				height="100%"
			>
				<defs>
					<radialGradient id="raysFade2" cx="50%" cy="45%" r="40%">
						<stop offset="0%" stopColor="var(--c-coin)" stopOpacity="0.15" />
						<stop offset="100%" stopColor="var(--c-coin)" stopOpacity="0" />
					</radialGradient>
				</defs>
				<rect width="100%" height="100%" fill="url(#raysFade2)" />
			</svg>

			<div className="font-display text-sm text-coin tracking-[0.36em] mb-6 z-[1]">
				REVELATION · {relics.length} OF {relics.length}
			</div>

			<div className="flex gap-[14px] flex-wrap justify-center max-w-[1600px] z-[1]">
				{relics.map((relic, i) => (
					<div key={relic.id} className="w-[280px] max-md:w-[240px]">
						<RelicCard
							relic={relic}
							variant="pull"
							revealing={!skipped}
							revealDelay={i * STAGGER_MS}
							onRevealComplete={onRevealComplete}
						/>
					</div>
				))}
			</div>

			<div className="flex gap-3 mt-8 z-[1]">
				{!allRevealed && (
					<button
						type="button"
						onClick={skipAll}
						className="px-6 py-[10px] border border-rule-strong display text-xs tracking-[0.22em] text-muted"
					>
						SKIP ALL
					</button>
				)}
				{allRevealed && (
					<button
						type="button"
						onClick={onClose}
						className="px-8 py-3 border border-coin display text-xs tracking-[0.28em] text-coin bg-[rgba(212,168,87,0.06)]"
					>
						COLLECT
					</button>
				)}
			</div>
		</Modal>
	);
}
