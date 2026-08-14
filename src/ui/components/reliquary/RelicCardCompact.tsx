import type { Relic } from "../../../game/types";
import { CardArt } from "./CardArt";
import type { CardContent } from "./cardContent";
import { RARITIES } from "./relicCardArt";

/**
 * The grid layout. At ~124px the pull card's flavour and full affix list are
 * unreadable, so this prints what a player sorts by: slot, name, the main roll,
 * and a pip per further affix with the signature marked.
 */
export function RelicCardCompact({
	relic,
	content,
}: {
	relic: Relic;
	content: CardContent;
}) {
	const R = RARITIES[relic.rarity];
	const [main, ...rest] = content.stats;

	return (
		<div className="rc-content rc-compact">
			<header className="rc-compact-head">
				<span className="rc-glyph">{R.glyph}</span>
				<span className="rc-compact-slot">{content.slotLabel}</span>
			</header>

			<CardArt relicId={relic.id} sigil={content.sigil} />

			<h3 className="rc-compact-name">{content.name}</h3>

			<div className="rc-compact-foot">
				<span className="rc-compact-label">{main.label}</span>
				<div className="rc-compact-row">
					<span className="rc-compact-val">{main.text}</span>
					{relic.upgradeLevel > 0 && (
						<span className="rc-compact-up">+{relic.upgradeLevel}</span>
					)}
					<span className="rc-compact-pips">
						{rest.map((s) => (
							<span key={s.id} data-sig={s.signature ? "1" : "0"} />
						))}
					</span>
				</div>
			</div>
		</div>
	);
}
