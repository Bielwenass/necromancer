/** Marks where a section's finished rows begin. */
export function RowGroupDivider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3.5 px-8 py-2 border-b border-[color:var(--rule)] bg-bg-inset">
			<div className="font-mono text-[9px] tracking-[0.2em] uppercase text-dim">
				{label}
			</div>
			<div className="flex-1 h-px bg-[color:var(--rule)]" />
		</div>
	);
}
