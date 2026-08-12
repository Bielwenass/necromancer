import {
	buildFoil,
	CardFrame,
	type RarityConfig,
	STAR_ANGLES,
	TICK_ANGLES,
} from "./relicCardArt";

// Same silhouette across rarities to preserve the gacha mystery.
// Higher rarities leak iridescence through the back as a hype tell.
export function RelicCardBack({
	R,
	backShimmer,
}: {
	R: RarityConfig;
	backShimmer: number;
}) {
	const backFoil = buildFoil(R.foilHues, 0.18, 72, 25);
	return (
		<div className="rc-back" aria-hidden>
			<div className="rc-face-inner">
				<div className="rc-back-base" />
				{backShimmer > 0 && (
					<div
						className="rc-back-foil"
						style={{
							opacity: backShimmer * 0.7,
							backgroundImage: backFoil,
						}}
					/>
				)}
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
				<CardFrame cornerOpacity={0.8} />
				<div className="rc-noise" style={{ opacity: 0.4 }} />
				<div className="rc-back-text rc-back-text-top">NECROMANCER</div>
				<div className="rc-back-text rc-back-text-bot">RELIC · BOUND</div>
			</div>
		</div>
	);
}
