interface SegmentedProps<T extends string> {
	value: T;
	options: readonly T[];
	onChange: (v: T) => void;
}

export function Segmented<T extends string>({
	value,
	options,
	onChange,
}: SegmentedProps<T>) {
	return (
		<div className="flex border border-[color:var(--rule-strong)]">
			{options.map((option) => (
				<button
					key={option}
					type="button"
					onClick={() => onChange(option)}
					className={`flex-1 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${
						option === value
							? "bg-bg-hover text-bone"
							: "text-dim hover:text-parchm"
					}`}
				>
					{option}
				</button>
			))}
		</div>
	);
}
