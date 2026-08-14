import type React from "react";

interface StatRowProps {
	label: React.ReactNode;
	value: React.ReactNode;
	/** Extra wrapper classes; pass an `items-*` utility where alignment matters. */
	className?: string;
	labelClassName?: string;
	valueClassName?: string;
	valueStyle?: React.CSSProperties;
}

export function StatRow({
	label,
	value,
	className,
	labelClassName = "mono text-xs text-dim tracking-[0.14em]",
	valueClassName = "mono text-xs text-bone",
	valueStyle,
}: StatRowProps) {
	return (
		<div className={`flex justify-between${className ? ` ${className}` : ""}`}>
			<span className={labelClassName}>{label}</span>
			<span className={valueClassName} style={valueStyle}>
				{value}
			</span>
		</div>
	);
}
