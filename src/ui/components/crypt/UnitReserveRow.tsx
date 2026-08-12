import type { ComponentType } from "react";
import type { UnitType } from "../../../game/types";

export function UnitReserveRow({
	type,
	count,
	icon,
	color,
	canSummon,
	onSummon,
	costFor,
}: {
	type: UnitType;
	count: number;
	icon?: ComponentType<{ size?: number; color?: string }>;
	color: string;
	canSummon: (v: number) => boolean;
	onSummon: () => void;
	/** Total price of raising `v` more, which climbs with the army's size. */
	costFor: (v: number) => string;
}) {
	const can1 = canSummon(1);
	const can10 = canSummon(10);
	const Icon = icon;

	return (
		<div className="flex items-center gap-2.5">
			{Icon ? (
				<Icon size={16} color={color} />
			) : (
				<div
					className="w-2.5 h-2.5 rounded-full shrink-0"
					style={{ background: color }}
				/>
			)}
			<span className="mono text-base text-bone min-w-8">{count}</span>
			<span className="mono text-xs uppercase tracking-[0.1em] flex-1 text-muted">
				{type}
			</span>

			<button
				type="button"
				onClick={onSummon}
				disabled={!can1}
				title={`Summon 1 ${type} (${costFor(1)})`}
				className="px-[10px] py-[3px] border mono text-xs tracking-[0.1em]"
				style={{
					borderColor: can1 ? color : "var(--rule)",
					color: can1 ? color : "var(--ink-faint)",
					cursor: can1 ? "pointer" : "not-allowed",
					opacity: can1 ? 1 : 0.5,
				}}
			>
				Raise
			</button>

			<button
				type="button"
				onClick={() => {
					if (can10) for (let i = 0; i < 10; i++) onSummon();
				}}
				disabled={!can10}
				title={`Summon 10 ${type}s (${costFor(10)})`}
				className="px-[10px] py-[3px] border mono text-xs tracking-[0.1em]"
				style={{
					borderColor: can10 ? color : "var(--rule)",
					color: can10 ? color : "var(--ink-faint)",
					cursor: can10 ? "pointer" : "not-allowed",
					opacity: can10 ? 1 : 0.5,
				}}
			>
				+10
			</button>
		</div>
	);
}
