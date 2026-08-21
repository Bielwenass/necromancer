import type { ButtonHTMLAttributes, CSSProperties } from "react";

/**
 * Named tones resolve to palette vars; any other string is taken as a CSS colour,
 * which is how runtime accents (unit, rarity, pool) drive a button. `neutral`
 * parts ink from line so an unaccented button keeps a hairline border.
 */
const TONES = {
	neutral: { ink: "var(--ink-parchm)", line: "var(--rule-strong)" },
	muted: { ink: "var(--ink-muted)", line: "var(--rule-strong)" },
	bone: { ink: "var(--ink-bone)", line: "var(--ink-bone)" },
	coin: { ink: "var(--c-coin)", line: "var(--c-coin)" },
	soul: { ink: "var(--c-soul)", line: "var(--c-soul)" },
	ember: { ink: "var(--c-ember)", line: "var(--c-ember)" },
	danger: { ink: "var(--hp-crit)", line: "var(--hp-crit)" },
} as const;

/** Small sizes read in mono, large ones in display; letterspacing tracks size. */
const SIZES = {
	xs: "min-h-6 px-2 py-0.5 gap-1 font-mono text-[11px] tracking-[0.1em]",
	sm: "min-h-7 px-3 py-1.5 gap-1.5 font-mono text-[11px] tracking-[0.12em]",
	md: "min-h-9 px-4 py-2.5 gap-2 font-display text-[11px] tracking-[0.16em]",
	lg: "min-h-11 px-8 py-3 gap-2.5 font-display text-xs tracking-[0.2em]",
	icon: "size-7 p-0 font-mono text-base tracking-normal",
} as const;

const VARIANTS = {
	outline:
		"bg-transparent hover:enabled:bg-[color-mix(in_srgb,var(--btn-ink)_10%,transparent)]",
	solid:
		"bg-[color-mix(in_srgb,var(--btn-ink)_9%,transparent)] hover:enabled:bg-[color-mix(in_srgb,var(--btn-ink)_18%,transparent)]",
	quiet:
		"border-transparent bg-transparent hover:enabled:bg-[color-mix(in_srgb,var(--btn-ink)_10%,transparent)]",
} as const;

const BASE =
	"inline-flex items-center justify-center border uppercase leading-none cursor-pointer transition-colors duration-150 text-[color:var(--btn-ink)] border-[color:var(--btn-line)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--btn-line)] disabled:cursor-not-allowed disabled:text-dim disabled:border-[color:var(--rule)] disabled:bg-transparent";

export type ButtonSize = keyof typeof SIZES;
export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonTone = keyof typeof TONES | (string & {});

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	tone?: ButtonTone;
	variant?: ButtonVariant;
	size?: ButtonSize;
	full?: boolean;
	/**
	 * Toggle state. `false` drops the button to a muted outline whatever `tone`
	 * says, `true` lights it in `tone`; omit it for a button that never toggles.
	 */
	selected?: boolean;
}

/** Every button in the game. Layout and spacing come from the call site. */
export function Button({
	tone = "neutral",
	variant = "outline",
	size = "md",
	full = false,
	selected,
	className,
	type = "button",
	...rest
}: ButtonProps) {
	const on = selected !== false;
	const named = TONES[tone as keyof typeof TONES];
	const { ink, line } = on ? (named ?? { ink: tone, line: tone }) : TONES.muted;

	return (
		<button
			type={type}
			style={{ "--btn-ink": ink, "--btn-line": line } as CSSProperties}
			className={`${BASE} ${SIZES[size]} ${VARIANTS[on ? variant : "outline"]}${
				full ? " w-full" : ""
			}${className ? ` ${className}` : ""}`}
			{...rest}
		/>
	);
}
