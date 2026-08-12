import type React from "react";

interface EmptyStateProps {
	children: React.ReactNode;
	/** Padding wrapper — sites differ between a padded block and a filled flex. */
	className?: string;
	textClassName?: string;
}

/** The dim, centred "nothing here yet" notice. */
export function EmptyState({
	children,
	className = "p-6 text-center",
	textClassName = "mono text-[10px] text-dim tracking-[0.14em]",
}: EmptyStateProps) {
	return (
		<div className={className}>
			<div className={textClassName}>{children}</div>
		</div>
	);
}
