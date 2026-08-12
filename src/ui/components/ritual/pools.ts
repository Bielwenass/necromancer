import { UNIT_COLORS } from "../../../game/data/units";
import type { PoolId } from "../../../game/types";
import bannerArt from "../../assets/rituals/banner.png";
import carrionArt from "../../assets/rituals/carrion.png";
import forbiddenArt from "../../assets/rituals/forbidden.png";

export interface PoolMeta {
	name: string;
	blurb: string;
	/** White-on-transparent line art, tinted to `accent` by `RitualArt`. */
	art: string;
	accent: string;
	/**
	 * The accent at low alpha, washed over the panel and the ×10 button.
	 * Alpha is tuned per accent, not shared — a lighter accent reads
	 * brighter at the same value.
	 */
	tint: string;
}

/**
 * Presentation for each gacha pool. The odds, costs and pity rules themselves
 * live in `POOL_CONFIGS` (`game/data/gacha.ts`) — this is only how a pool looks.
 */
export const POOL_META: Record<PoolId, PoolMeta> = {
	banner: {
		name: "Banner Ritual",
		blurb:
			"Standards taken off cleared ground, burned at the circle. What the fallen carried comes back up with the smoke.",
		art: bannerArt,
		accent: "var(--c-ember)",
		tint: "rgba(214,122,48,0.07)",
	},
	carrion: {
		name: "Carrion Ritual",
		blurb:
			"Bodies laid out in a ring and left to it. The circle takes the flesh and hands back what was buried in it.",
		art: carrionArt,
		accent: UNIT_COLORS.zombie,
		tint: "rgba(149,184,122,0.08)",
	},
	forbidden: {
		name: "Forbidden Ritual",
		blurb:
			"Names that should not be spoken, bought with souls. What they hand back is old, potent, and not grateful.",
		art: forbiddenArt,
		accent: "var(--c-soul)",
		tint: "rgba(155,122,214,0.08)",
	},
};
