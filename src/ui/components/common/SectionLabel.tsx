import type React from "react";

interface SectionLabelProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * The uppercase, wide-tracked eyebrow heading a panel or column. Uses Tailwind's
 * `font-display`; the legacy `.display` class sets its own letter-spacing and
 * would need a `!tracking-[…]` to override.
 */
export function SectionLabel({ children, className }: SectionLabelProps) {
	return (
		<div
			className={`font-display uppercase${className ? ` ${className}` : " text-[13px] text-parchm tracking-[0.28em]"}`}
		>
			{children}
		</div>
	);
}
