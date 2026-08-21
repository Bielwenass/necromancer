interface LabSliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	suffix?: string;
	onChange: (value: number) => void;
}

export function LabSlider({
	label,
	value,
	min,
	max,
	step,
	suffix = "",
	onChange,
}: LabSliderProps) {
	return (
		<label className="block">
			<div className="flex justify-between items-baseline mono text-[11px] tracking-[0.12em] uppercase text-muted">
				<span>{label}</span>
				<span className="text-bone">
					{step < 1 ? value.toFixed(2) : value}
					{suffix}
				</span>
			</div>
			<input
				type="range"
				className="w-full accent-coin"
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
			/>
		</label>
	);
}
