import type { UnitType } from "../../../game/types";
import { Button } from "../common/Button";
import { UnitDot } from "../common/UnitDot";
import type { IconComponent } from "../icons/IconProps";

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
	icon?: IconComponent;
	color: string;
	canSummon: (v: number) => boolean;
	onSummon: () => void;
	costFor: (v: number) => string;
}) {
	const can1 = canSummon(1);
	const can10 = canSummon(10);
	const Icon = icon;

	return (
		<div className="flex items-center gap-2.5">
			{Icon ? <Icon size={16} color={color} /> : <UnitDot color={color} />}
			<span className="mono text-base text-bone min-w-8">{count}</span>
			<span className="mono text-xs uppercase tracking-[0.1em] flex-1 text-muted">
				{type}
			</span>

			<Button
				size="xs"
				tone={color}
				disabled={!can1}
				onClick={onSummon}
				title={`Summon 1 ${type} (${costFor(1)})`}
			>
				Raise
			</Button>

			<Button
				size="xs"
				tone={color}
				disabled={!can10}
				onClick={() => {
					if (can10) for (let i = 0; i < 10; i++) onSummon();
				}}
				title={`Summon 10 ${type}s (${costFor(10)})`}
			>
				+10
			</Button>
		</div>
	);
}
