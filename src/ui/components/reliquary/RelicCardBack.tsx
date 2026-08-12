import { CardFrame, STAR_ANGLES, TICK_ANGLES } from "./relicCardArt";

/**
 * The card back. Same substrate, frame, noise and padding grid as the front —
 * it is the same object turned over, so nothing here moves or glows. The seal
 * is engraved line work at the front's art weight, and its silhouette is
 * identical across rarities; only the tint the whole card carries comes
 * through.
 */
export function RelicCardBack({ noise }: { noise: number }) {
	return (
		<div className="rc-back" aria-hidden>
			<div className="rc-face-inner">
				<div className="rc-base" />
				<div className="rc-noise" style={{ opacity: noise }} />

				<svg
					aria-hidden="true"
					className="rc-back-seal"
					viewBox="0 0 320 460"
					preserveAspectRatio="xMidYMid meet"
				>
					<g transform="translate(160 230)">
						<circle
							r="98"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.4"
							strokeWidth="0.6"
						/>
						<circle
							r="86"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.75"
							strokeWidth="0.6"
						/>
						<circle
							r="68"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.4"
							strokeWidth="0.5"
							strokeDasharray="1.5 3"
						/>
						<circle
							r="44"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.6"
							strokeWidth="0.5"
						/>
						<circle
							r="32"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.25"
							strokeWidth="0.5"
							strokeDasharray="0.5 2"
						/>
						{[0, 90, 180, 270].map((a) => (
							<g key={a} transform={`rotate(${a})`}>
								<line
									x1="0"
									y1="-98"
									x2="0"
									y2="-86"
									stroke="currentColor"
									strokeOpacity="0.85"
									strokeWidth="0.8"
								/>
								<circle
									cx="0"
									cy="-92"
									r="1.2"
									fill="currentColor"
									fillOpacity="0.7"
								/>
							</g>
						))}
						{TICK_ANGLES.map((deg) => (
							<g key={deg} transform={`rotate(${deg})`}>
								<line
									x1="0"
									y1="-95"
									x2="0"
									y2="-88"
									stroke="currentColor"
									strokeOpacity="0.45"
									strokeWidth="0.5"
								/>
							</g>
						))}
						<g opacity="0.55">
							{STAR_ANGLES.map((deg) => {
								const a1 = (deg * Math.PI) / 180;
								const a2 = ((deg + 120) * Math.PI) / 180;
								const r = 40;
								return (
									<line
										key={deg}
										x1={Math.cos(a1) * r}
										y1={Math.sin(a1) * r}
										x2={Math.cos(a2) * r}
										y2={Math.sin(a2) * r}
										stroke="currentColor"
										strokeOpacity="0.6"
										strokeWidth="0.4"
									/>
								);
							})}
						</g>
						<circle
							r="6"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.9"
							strokeWidth="0.6"
						/>
						<circle r="1.6" fill="currentColor" fillOpacity="0.85" />
					</g>
				</svg>

				<CardFrame cornerOpacity={0.5} />

				{/* Reuses .rc-content, so the two labels land on the same padding
				    grid as the front's header and serial. */}
				<div className="rc-content rc-back-content">
					<span className="rc-back-text">NECROMANCER</span>
					<span className="rc-back-text">RELIC · BOUND</span>
				</div>
			</div>
		</div>
	);
}
