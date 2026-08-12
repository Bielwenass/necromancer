import { UNIT_COLORS } from "../../../game/data/units";
import type { Resources } from "../../../game/types";
import { IconBanner, IconBone, IconCorpse, IconDust, IconSoul } from "../icons";
import type { IconComponent } from "../icons/IconProps";

export interface ResourceMeta {
	icon: IconComponent;
	color: string;
	label: string;
}

const RESOURCE_META: Record<string, ResourceMeta> = {
	bones: { icon: IconBone, color: "var(--c-bone)", label: "Bones" },
	souls: { icon: IconSoul, color: "var(--c-soul)", label: "Souls" },
	dust: { icon: IconDust, color: "var(--ink-parchm)", label: "Dust" },
	corpses: { icon: IconCorpse, color: UNIT_COLORS.zombie, label: "Corpses" },
	banners: { icon: IconBanner, color: "var(--c-ember)", label: "Banners" },
};

/** Icon/color/label for a resource key, falling back to bones for unknowns. */
export function resourceMeta(resource: string): ResourceMeta {
	return (
		RESOURCE_META[resource] ?? {
			icon: IconBone,
			color: "var(--c-bone)",
			label: resource,
		}
	);
}

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
			const d = resourceMeta(k);
			const ok = (res[k as keyof Resources] ?? 0) >= (v as number);
			return { key: k, amount: v as number, ok, ...d };
		});
}
