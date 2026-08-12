/**
 * The highlight artwork on a ritual panel.
 *
 * The source PNGs are white line art on transparency, so only their alpha
 * carries the drawing. Rendering them through a CSS mask over a solid fill
 * tints the art to the pool accent exactly, instead of leaving three white
 * plates in an otherwise warm palette.
 */
export function RitualArt({ src, color }: { src: string; color: string }) {
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 opacity-90 [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
			style={{
				background: color,
				// Runtime values: the imported asset URL and the pool accent.
				// Autoprefixer only sees the stylesheet, so the inline mask
				// carries its own -webkit- spelling for older Safari.
				WebkitMaskImage: `url(${src})`,
				maskImage: `url(${src})`,
			}}
		/>
	);
}
