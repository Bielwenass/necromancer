import type React from "react";

interface SectionLabelProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * The uppercase, wide-tracked eyebrow that heads a panel or column.
 *
 * Uses Tailwind's `font-display` rather than the legacy `.display` class, so no
 * `!tracking-[…]` override is needed to beat that class's own letter-spacing.
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
