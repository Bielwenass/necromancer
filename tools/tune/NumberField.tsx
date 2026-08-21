interface NumberFieldProps {
	label: string;
	value: number;
	onChange: (v: number) => void;
	step?: number;
	min?: number;
	/** Shown when the value has been moved off its starting point. */
	changed?: boolean;
	onReset?: () => void;
}

export function NumberField({
	label,
	value,
	onChange,
	step = 1,
	min,
	changed = false,
	onReset,
}: NumberFieldProps) {
	return (
		<label className="flex items-center justify-between gap-3 py-1 font-mono text-[11px]">
			<span
				className={`truncate ${changed ? "text-ember" : "text-muted"}`}
				title={label}
			>
				{label}
			</span>
			<span className="flex shrink-0 items-center gap-1">
				{changed && onReset && (
					<button
						type="button"
						onClick={onReset}
						className="px-1 text-dim hover:text-bone"
						title="Reset"
					>
						↺
					</button>
				)}
				<input
					type="number"
					value={value}
					step={step}
					min={min}
					onChange={(e) => {
						const next = Number(e.target.value);
						if (!Number.isNaN(next)) onChange(next);
					}}
					className={`w-24 border bg-bg-inset px-2 py-1 text-right outline-none focus:border-[color:var(--rule-strong)] ${
						changed
							? "border-ember text-ember"
							: "border-[color:var(--rule)] text-bone"
					}`}
				/>
			</span>
		</label>
	);
}
