import { UNIT_COLORS } from "../game/data/units";
import { RESOURCE_KEYS } from "../game/rules/resources";
import type { Resources } from "../game/types";
import {
	IconBanner,
	IconBone,
	IconCorpse,
	IconDust,
	IconSoul,
} from "./components/icons";
import type { IconComponent } from "./components/icons/IconProps";

export interface ResourceMeta {
	icon: IconComponent;
	color: string;
	label: string;
}

/** How each resource is drawn, wherever one is named: bar, cost line, or plot. */
const RESOURCE_META: Record<keyof Resources, ResourceMeta> = {
	bones: { icon: IconBone, color: "var(--c-bone)", label: "Bones" },
	souls: { icon: IconSoul, color: "var(--c-soul)", label: "Souls" },
	dust: { icon: IconDust, color: "var(--ink-parchm)", label: "Dust" },
	corpses: { icon: IconCorpse, color: UNIT_COLORS.zombie, label: "Corpses" },
	banners: { icon: IconBanner, color: "var(--c-ember)", label: "Banners" },
};

export { RESOURCE_KEYS };

/** Icon/color/label for a resource key, falling back to bones for unknowns. */
export function resourceMeta(resource: string): ResourceMeta {
	return (
		RESOURCE_META[resource as keyof Resources] ?? {
			icon: IconBone,
			color: "var(--c-bone)",
			label: resource,
		}
	);
}
