import { useState } from "react";
import { describeAffixEffects } from "../../../game/rules/describe";
import { getAffixDescription } from "../../../game/rules/relics";
import type { Relic } from "../../../game/types";
import { CardArt } from "./CardArt";
import type { CardContent } from "./cardContent";
import { RARITIES } from "./relicCardArt";

interface RelicCardFullProps {
	relic: Relic;
	content: CardContent;
	/** A card mid-flip answers nothing; tips wait for it to land. */
	interactive: boolean;
}

/** The pull layout: full frame, flavour, every affix, and a tip per affix. */
export function RelicCardFull({
	relic,
	content,
	interactive,
}: RelicCardFullProps) {
	const [tipId, setTipId] = useState<string | null>(null);
	const R = RARITIES[relic.rarity];
	const tip = interactive
		? content.stats.find((s) => s.id === tipId)
		: undefined;
	const tipLines = tip
		? describeAffixEffects(tip.id, tip.value, relic.upgradeLevel)
		: [];
	const tipFlavor = tip ? getAffixDescription(tip.id) : undefined;

	return (
		<div className="rc-content">
			<header className="rc-head">
				<div className="rc-head-l">
					<span className="rc-glyph">{R.glyph}</span>
					<span className="rc-type">{content.slotLabel}</span>
				</div>
				<span className="rc-rarity-tag">{R.label}</span>
			</header>

			<CardArt relicId={relic.id} sigil={content.sigil} />

			<div className="rc-title">
				<h2 className="rc-name">{content.name}</h2>
				{content.flavor && <p className="rc-flavor">{content.flavor}</p>}
			</div>

			<footer className="rc-foot">
				{tip && (
					<div className="rc-stat-tip">
						<ul className="rc-tip-lines">
							{tipLines.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
						{tipFlavor && <p className="rc-tip-flavor">{tipFlavor}</p>}
					</div>
				)}
				<ul className="rc-stats">
					{content.stats.map((s) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: supplementary tap-toggle on a row that isn't independently focusable; the card's own select/equip button stays keyboard-accessible.
						<li
							key={s.id}
							onMouseEnter={() => interactive && setTipId(s.id)}
							onMouseLeave={() => setTipId(null)}
							onClick={(e) => {
								e.stopPropagation();
								if (interactive) setTipId((id) => (id === s.id ? null : s.id));
							}}
						>
							<span className="rc-stat-k">
								{s.signature ? "◆" : ""}
								{s.label}
							</span>
							<span className="rc-stat-dot" />
							<span className="rc-stat-v">{s.text}</span>
						</li>
					))}
				</ul>
				<div className="rc-serial">№ {content.serial}</div>
			</footer>
		</div>
	);
}
