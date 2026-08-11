import type { ReactNode } from "react";

/**
 * A toggle pill used by the inventory filter rows. `color` is the accent the
 * chip takes when active — a palette value picked at runtime, hence inline.
 */
export function FilterChip({
	label,
	color,
	active,
	icon,
	onClick,
}: {
	label: string;
	color: string;
	active: boolean;
	icon?: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="mono text-[11px] px-2 py-0.5 cursor-pointer tracking-[0.12em] uppercase border flex items-center gap-1"
			style={{
				borderColor: active ? color : "var(--rule)",
				color: active ? color : "var(--ink-muted)",
			}}
		>
			{icon}
			{label}
		</button>
	);
}
