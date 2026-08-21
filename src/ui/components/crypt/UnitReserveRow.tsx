import { canAffordCost } from "../../../game/rules/resources";
import type { Resources, UnitType } from "../../../game/types";
import { formatCost } from "../../format";
import { Button } from "../common/Button";
import { CostChips } from "../common/CostChips";
import { UnitDot } from "../common/UnitDot";
import type { IconComponent } from "../icons/IconProps";

/** Batch sizes a row raises in; the single reads as the verb, the rest as steps. */
const RAISE_STEPS = [1, 10] as const;

export function UnitReserveRow({
	type,
	count,
	icon,
	color,
	resources,
	costFor,
	onSummon,
}: {
	type: UnitType;
	count: number;
	icon?: IconComponent;
	color: string;
	resources: Resources;
	costFor: (v: number) => Partial<Resources>;
	onSummon: (v: number) => void;
}) {
	const Icon = icon;

	// Cells of the list's grid: shared columns line the rows up and each takes
	// only its widest cell. Narrower than the panel width that seats identity and
	// pair together, the identity claims the full row and the pair drops under it.
	return (
		<>
			<div className="col-span-3 flex min-w-0 items-center gap-2.5 [@container(min-width:316px)]:col-span-1">
				{Icon ? <Icon size={16} color={color} /> : <UnitDot color={color} />}
				<span className="mono min-w-7 text-base text-bone">{count}</span>
				<span className="mono min-w-0 truncate text-xs uppercase tracking-wider text-muted">
					{type}
				</span>
			</div>

			{RAISE_STEPS.map((step, i) => {
				const cost = costFor(step);
				return (
					<Button
						key={step}
						size="xs"
						tone={color}
						// Once wrapped, the pair keeps the two button columns rather than
						// falling into the identity's, which would stretch it.
						className={`mb-2 py-1 [@container(min-width:316px)]:mb-0 ${i === 0 ? "col-start-2 [@container(min-width:316px)]:col-start-auto" : ""}`}
						disabled={!canAffordCost(cost, resources)}
						onClick={() => onSummon(step)}
						title={`Summon ${step} ${type}${step > 1 ? "s" : ""} (${formatCost(cost)})`}
					>
						<span className="flex flex-col items-center gap-0.5">
							{step === 1 ? "Raise" : `+${step}`}
							<span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-normal">
								<CostChips cost={cost} resources={resources} size={11} />
							</span>
						</span>
					</Button>
				);
			})}
		</>
	);
}
