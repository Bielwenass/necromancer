/** The purchase button shared by every detail-panel body. */
export function BuyButton({
	label,
	disabled,
	onClick,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className="block w-full py-3 border border-ember bg-[rgba(214,122,48,0.06)] text-ember font-display text-[11px] tracking-[0.22em] uppercase cursor-pointer transition-colors duration-[120ms] hover:enabled:bg-[rgba(214,122,48,0.14)] disabled:border-[color:var(--rule-strong)] disabled:text-dim disabled:bg-transparent disabled:cursor-not-allowed"
			disabled={disabled}
			onClick={onClick}
		>
			{label}
		</button>
	);
}
