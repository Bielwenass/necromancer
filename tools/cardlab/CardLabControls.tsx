import { RARITY_ORDER, RELIC_BASES } from "../../src/game/data/relics";
import type { Rarity } from "../../src/game/types";
import { SectionLabel } from "../../src/ui/components/common/SectionLabel";
import { rarityName } from "../../src/ui/theme";
import { LabSelect } from "./LabSelect";
import { LabSlider } from "./LabSlider";
import { LabToggle } from "./LabToggle";
import {
	FLIP_SLIDER,
	type LabState,
	type LabView,
	MATERIAL_SLIDERS,
	TWEAK_TOGGLES,
} from "./labControls";

const VIEWS: LabView[] = ["front", "back", "reveal"];

const BTN =
	"px-3 py-2 border border-rule-strong mono text-[11px] tracking-[0.18em] uppercase text-muted hover:text-bone hover:bg-bg-hover";

interface CardLabControlsProps {
	state: LabState;
	onChange: (patch: Partial<LabState>) => void;
	onReroll: () => void;
	onReplay: () => void;
}

export function CardLabControls({
	state,
	onChange,
	onReroll,
	onReplay,
}: CardLabControlsProps) {
	const setTweak = (key: string, value: number | boolean | string) =>
		onChange({ tweaks: { ...state.tweaks, [key]: value } });

	return (
		<div className="w-[300px] shrink-0 h-full overflow-y-auto border-r border-rule-strong bg-bg-panel p-4 flex flex-col gap-5">
			<div className="grid grid-cols-3 gap-1">
				{VIEWS.map((v) => (
					<button
						key={v}
						type="button"
						className={`${BTN} ${state.view === v ? "text-coin border-coin bg-[rgba(212,168,87,0.06)]" : ""}`}
						onClick={() => onChange({ view: v })}
					>
						{v}
					</button>
				))}
			</div>

			<section className="flex flex-col gap-3">
				<SectionLabel>Relic</SectionLabel>
				<LabSelect
					label="Base"
					value={state.baseId}
					options={RELIC_BASES.map((b) => ({
						value: b.id,
						label: `${b.name} · ${b.slot}`,
					}))}
					onChange={(baseId) => onChange({ baseId })}
				/>
				<LabSelect
					label="Rarity"
					value={state.rarity}
					options={RARITY_ORDER.map((r) => ({
						value: r,
						label: rarityName(r),
					}))}
					onChange={(rarity) => onChange({ rarity: rarity as Rarity })}
				/>
				<LabSelect
					label="Variant"
					value={state.variant}
					options={[
						{ value: "pull", label: "pull (gacha)" },
						{ value: "inventory", label: "inventory (grid)" },
					]}
					onChange={(variant) =>
						onChange({ variant: variant as LabState["variant"] })
					}
				/>
				<LabToggle
					label="All rarities"
					checked={state.allRarities}
					onChange={(allRarities) => onChange({ allRarities })}
				/>
				<LabSlider
					label="Copies"
					value={state.copies}
					min={1}
					max={12}
					step={1}
					onChange={(copies) => onChange({ copies })}
				/>
				<LabSlider
					label="Card width"
					value={state.cardWidth}
					min={120}
					max={520}
					step={4}
					suffix="px"
					onChange={(cardWidth) => onChange({ cardWidth })}
				/>
				<button type="button" className={BTN} onClick={onReroll}>
					Reroll affixes
				</button>
			</section>

			<section className="flex flex-col gap-3">
				<SectionLabel>Material</SectionLabel>
				{MATERIAL_SLIDERS.map((s) => (
					<LabSlider
						key={s.key}
						label={s.label}
						value={state.tweaks[s.key]}
						min={s.min}
						max={s.max}
						step={s.step}
						suffix={s.suffix}
						onChange={(v) => setTweak(s.key, v)}
					/>
				))}
				{TWEAK_TOGGLES.map((t) => (
					<LabToggle
						key={t.key}
						label={t.label}
						checked={state.tweaks[t.key]}
						onChange={(v) => setTweak(t.key, v)}
					/>
				))}
			</section>

			<section className="flex flex-col gap-3">
				<SectionLabel>Reveal</SectionLabel>
				<LabSlider
					label={FLIP_SLIDER.label}
					value={state.tweaks[FLIP_SLIDER.key]}
					min={FLIP_SLIDER.min}
					max={FLIP_SLIDER.max}
					step={FLIP_SLIDER.step}
					suffix={FLIP_SLIDER.suffix}
					onChange={(v) => setTweak(FLIP_SLIDER.key, v)}
				/>
				<LabSlider
					label="Stagger"
					value={state.stagger}
					min={0}
					max={1500}
					step={10}
					suffix="ms"
					onChange={(stagger) => onChange({ stagger })}
				/>
				<button type="button" className={BTN} onClick={onReplay}>
					Play reveal
				</button>
			</section>

			<section className="flex flex-col gap-2">
				<SectionLabel>Tweaks</SectionLabel>
				<pre className="mono text-[10px] leading-relaxed text-parchm bg-bg-inset border border-rule p-2 overflow-x-auto">
					{JSON.stringify(state.tweaks, null, 2)}
				</pre>
				<button
					type="button"
					className={BTN}
					onClick={() =>
						navigator.clipboard?.writeText(
							JSON.stringify(state.tweaks, null, 2),
						)
					}
				>
					Copy
				</button>
			</section>
		</div>
	);
}
