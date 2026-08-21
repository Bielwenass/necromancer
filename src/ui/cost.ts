import type { Resources } from "../game/types";
import type { IconComponent } from "./components/icons/IconProps";
import { RESOURCE_META } from "./resources";

export interface CostLine {
	key: string;
	amount: number;
	/** Whether the player currently holds enough of this resource. */
	ok: boolean;
	icon: IconComponent;
	color: string;
	label: string;
}

export function costLines(
	cost: Partial<Resources>,
	res: Resources,
): CostLine[] {
	return Object.entries(cost)
		.filter(([, v]) => (v ?? 0) > 0)
		.map(([k, v]) => {
			const d = RESOURCE_META[k as keyof Resources];
			const ok = (res[k as keyof Resources] ?? 0) >= (v as number);
			return { key: k, amount: v as number, ok, ...d };
		});
}
