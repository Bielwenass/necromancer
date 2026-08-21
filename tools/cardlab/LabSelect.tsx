interface LabSelectProps {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}

export function LabSelect({ label, value, options, onChange }: LabSelectProps) {
	return (
		<label className="block">
			<span className="mono text-[11px] tracking-[0.12em] uppercase text-muted">
				{label}
			</span>
			<select
				className="w-full mt-1 px-2 py-1 bg-bg-inset border border-rule-strong text-bone mono text-xs"
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</label>
	);
}
