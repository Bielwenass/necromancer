/** The art plate both layouts carry: hatching, centre lines and the rarity sigil. */
export function CardArt({
	relicId,
	sigil,
}: {
	relicId: string;
	sigil: string;
}) {
	return (
		<div className="rc-art">
			<svg
				className="rc-art-stripes"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<defs>
					<pattern
						id={`stripes-${relicId}`}
						width="6"
						height="6"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="6"
							stroke="currentColor"
							strokeWidth="0.5"
							strokeOpacity="0.4"
						/>
					</pattern>
				</defs>
				<rect width="100" height="100" fill={`url(#stripes-${relicId})`} />
			</svg>
			<div className="rc-art-cross">
				<span />
				<span />
			</div>
			<span className="rc-art-sigil">{sigil}</span>
		</div>
	);
}
