interface LabToggleProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export function LabToggle({ label, checked, onChange }: LabToggleProps) {
	return (
		<label className="flex items-center gap-2 mono text-[11px] tracking-[0.12em] uppercase text-muted cursor-pointer">
			<input
				type="checkbox"
				className="accent-coin"
				checked={checked}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
			<span className={checked ? "text-bone" : undefined}>{label}</span>
		</label>
	);
}
