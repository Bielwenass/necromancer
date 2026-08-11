import type { ComponentType } from "react";
import type { Resources } from "../../../game/types";
import { IconBone, IconCoin, IconCorpse, IconSoul } from "../icons";

export type ResIcon = ComponentType<{ size?: number; color?: string }>;

const RES: Record<string, { icon: ResIcon; color: string; label: string }> = {
	bones: { icon: IconBone, color: "var(--c-bone)", label: "Bones" },
	coins: { icon: IconCoin, color: "var(--c-coin)", label: "Gold" },
	souls: { icon: IconSoul, color: "var(--c-soul)", label: "Souls" },
	corpses: { icon: IconCorpse, color: "var(--sq-zombie)", label: "Corpses" },
};

export interface CostLine {
	key: string;
	amount: number;
	/** Whether the player currently holds enough of this resource. */
	ok: boolean;
	icon: ResIcon;
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
			const d = RES[k] ?? {
				icon: IconBone,
				color: "var(--c-bone)",
				label: k,
			};
			const ok = (res[k as keyof Resources] ?? 0) >= (v as number);
			return { key: k, amount: v as number, ok, ...d };
		});
}
