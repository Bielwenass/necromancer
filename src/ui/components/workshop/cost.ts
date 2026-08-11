import type { ComponentType } from "react";
import type { Resources } from "../../../game/types";
import {
	IconBanner,
	IconBone,
	IconCoin,
	IconCorpse,
	IconDust,
	IconSoul,
} from "../icons";

export type ResIcon = ComponentType<{ size?: number; color?: string }>;

export interface ResMeta {
	icon: ResIcon;
	color: string;
	label: string;
}

const RES: Record<string, ResMeta> = {
	bones: { icon: IconBone, color: "var(--c-bone)", label: "Bones" },
	coins: { icon: IconCoin, color: "var(--c-coin)", label: "Gold" },
	souls: { icon: IconSoul, color: "var(--c-soul)", label: "Souls" },
	dust: { icon: IconDust, color: "var(--ink-parchm)", label: "Dust" },
	corpses: { icon: IconCorpse, color: "var(--sq-zombie)", label: "Corpses" },
	banners: { icon: IconBanner, color: "var(--c-ember)", label: "Banners" },
};

/** Icon/color/label for a resource key, falling back to bones for unknowns. */
export function resMeta(resource: string): ResMeta {
	return (
		RES[resource] ?? { icon: IconBone, color: "var(--c-bone)", label: resource }
	);
}

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
			const d = resMeta(k);
			const ok = (res[k as keyof Resources] ?? 0) >= (v as number);
			return { key: k, amount: v as number, ok, ...d };
		});
}
