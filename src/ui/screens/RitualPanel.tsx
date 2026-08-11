import { useEffect, useState } from "react";
import { POOL_CONFIGS } from "../../game/gacha";
import { useGameStore } from "../../game/store";
import type { PoolId, Rarity, Relic } from "../../game/types";
import { IconBone, IconCoin, IconSoul } from "../components/icons";
import { RelicGlyph } from "../components/RelicGlyph";
import { formatNumber, rarityColor, rarityName } from "../theme";
import { RevealOverlay } from "./RevealOverlay";

const POOL_META: Record<
	PoolId,
	{
		name: string;
		blurb: string;
		glyph: string;
		accent: string;
		/**
		 * The accent at low alpha, washed over the panel and the ×10 button.
		 * Alpha is tuned per accent, not shared — `bone` is a far lighter
		 * colour and reads brighter at the same value.
		 */
		tint: string;
		pityMax: number;
		pityGuaranteed: Rarity | null;
	}
> = {
	bone: {
		name: "Bone Ritual",
		blurb:
			"Bone-meal scattered on the circle. Whatever the graveyard's tenants were buried holding surfaces with it.",
		glyph: "hex",
		accent: "var(--c-bone)",
		tint: "rgba(232,220,192,0.06)",
		pityMax: 0,
		pityGuaranteed: null,
	},
	soul: {
		name: "Obol Ritual",
		blurb:
			"The ferryman's fare, paid many times over. The dead give up what they were buried wearing.",
		glyph: "ring",
		accent: "var(--c-coin)",
		tint: "rgba(212,168,87,0.08)",
		pityMax: 20,
		pityGuaranteed: "rare",
	},
	forbidden: {
		name: "Forbidden Ritual",
		blurb:
			"Names that should not be spoken, bought with souls. What they hand back is old, potent, and not grateful.",
		glyph: "moon",
		accent: "var(--c-soul)",
		tint: "rgba(155,122,214,0.08)",
		pityMax: 50,
		pityGuaranteed: "legendary",
	},
};

export function RitualPanel({ poolId }: { poolId: PoolId }) {
	const meta = POOL_META[poolId];
	const config = POOL_CONFIGS[poolId];
	const resources = useGameStore((s) => s.resources);
	const pull = useGameStore((s) => s.pull);
	const clearLastPulled = useGameStore((s) => s.clearLastPulled);
	const lastPulledRelics = useGameStore((s) => s.gacha.lastPulledRelics);
	const pityCounter = useGameStore((s) => s.gacha.pityCounters[poolId]);

	const [revealRelics, setRevealRelics] = useState<Relic[]>([]);
	const [myPullPending, setMyPullPending] = useState(false);

	const cost1 = config.cost1.amount;
	const cost10 = config.cost10.amount;
	const resource = config.cost1.resource;

	const available =
		resource === "bones"
			? resources.bones
			: resource === "coins"
				? resources.coins
				: resources.souls;

	const canPull1 = available >= cost1;
	const canPull10 = available >= cost10;

	const doPull = (count: 1 | 10) => {
		if (count === 1 && !canPull1) return;
		if (count === 10 && !canPull10) return;
		clearLastPulled();
		setMyPullPending(true);
		pull(poolId, count);
	};

	useEffect(() => {
		if (myPullPending && lastPulledRelics && lastPulledRelics.length > 0) {
			setRevealRelics(lastPulledRelics);
			setMyPullPending(false);
		}
	}, [lastPulledRelics, myPullPending]);

	const ResourceIcon =
		resource === "bones"
			? IconBone
			: resource === "coins"
				? IconCoin
				: IconSoul;

	return (
		<div
			className="flex-1 border-r border-[color:var(--rule)] py-8 px-7 flex flex-col relative bg-bg-deep"
			style={{
				backgroundImage: `linear-gradient(180deg, ${meta.tint}, transparent 70%)`,
			}}
		>
			<div className="font-display text-3xl text-bone tracking-[0.18em] mt-3 uppercase">
				{meta.name}
			</div>
			<div
				className="w-15 h-px mt-3.5 opacity-60"
				style={{ background: meta.accent }}
			/>
			<div className="font-body text-md text-parchm italic mt-4 leading-normal">
				{meta.blurb}
			</div>

			<div
				className="cornered mt-7 h-[180px] flex items-center justify-center relative opacity-95 border"
				style={{
					borderColor: meta.accent,
					backgroundImage: `radial-gradient(ellipse at 50% 60%, ${meta.tint}, transparent 70%)`,
				}}
			>
				<svg
					aria-hidden="true"
					width="100%"
					height="100%"
					className="absolute inset-0"
				>
					<circle
						cx="50%"
						cy="50%"
						r="60"
						fill="none"
						stroke={meta.accent}
						strokeWidth="1"
						opacity="0.18"
					/>
					<circle
						cx="50%"
						cy="50%"
						r="80"
						fill="none"
						stroke={meta.accent}
						strokeWidth="1"
						opacity="0.10"
						strokeDasharray="3 5"
					/>
				</svg>
				<RelicGlyph kind={meta.glyph} size={80} color={meta.accent} />
			</div>

			<div className="mt-5">
				<div className="flex justify-between mb-2 font-display text-xs text-parchm tracking-[0.22em] uppercase">
					Drop Odds
				</div>
				<div className="flex h-1.5 mb-2">
					{config.odds.map((o) => (
						<div
							key={o.rarity}
							className="opacity-[0.85]"
							style={{
								width: `${o.weight}%`,
								background: rarityColor(o.rarity),
							}}
						/>
					))}
				</div>
				{config.odds.map((o, i) => (
					<div
						key={o.rarity}
						className={`flex items-baseline py-[3px] ${
							i < config.odds.length - 1 ? "border-b border-rule" : ""
						}`}
					>
						<span
							className="w-2 h-2 mr-2 inline-block"
							style={{ background: rarityColor(o.rarity) }}
						/>
						<span
							className="mono text-[11px] tracking-[0.12em] uppercase"
							style={{ color: rarityColor(o.rarity) }}
						>
							{rarityName(o.rarity)}
						</span>
						<span className="mono text-[11px] text-bone ml-auto">
							{o.weight.toFixed(1)}
							<span className="text-dim">%</span>
						</span>
					</div>
				))}
			</div>

			{meta.pityGuaranteed && meta.pityMax > 0 && (
				<div className="mt-[18px] py-3 px-3.5 border border-[color:var(--rule-strong)] bg-bg-inset">
					<div className="flex justify-between mb-1.5">
						<span className="font-mono text-[9px] text-dim tracking-[0.16em]">
							PITY COUNTER
						</span>
						<span className="font-mono text-[11px] text-bone">
							{pityCounter}
							<span className="text-dim">/{meta.pityMax}</span>
						</span>
					</div>
					<div className="h-[5px] bg-bg-inset border border-[color:var(--rule)] relative overflow-hidden">
						<i
							className="block h-full"
							style={{
								width: `${(pityCounter / meta.pityMax) * 100}%`,
								background: rarityColor(meta.pityGuaranteed),
							}}
						/>
					</div>
					<div className="mt-1.5">
						<span className="font-mono text-[10px] text-parchm">
							{meta.pityMax - pityCounter} to guaranteed{" "}
						</span>
						<span
							className="font-mono text-[10px] tracking-[0.14em] uppercase"
							style={{ color: rarityColor(meta.pityGuaranteed) }}
						>
							{rarityName(meta.pityGuaranteed)}
						</span>
					</div>
				</div>
			)}

			<div className="mt-auto pt-5 flex gap-2.5">
				<button
					type="button"
					onClick={() => doPull(1)}
					disabled={!canPull1}
					className={`flex-1 py-3.5 px-0 bg-transparent flex flex-col items-center gap-1 ${
						canPull1 ? "cursor-pointer" : "cursor-not-allowed"
					}`}
					style={{
						border: `1px solid ${canPull1 ? meta.accent : "var(--rule)"}`,
						color: canPull1 ? meta.accent : "var(--ink-dim)",
					}}
				>
					<span className="font-display text-xs tracking-[0.28em]">PULL</span>
					<span className="inline-flex items-center gap-1">
						<ResourceIcon
							size={16}
							color={canPull1 ? meta.accent : "var(--ink-dim)"}
						/>
						<span className="font-mono text-xs">{formatNumber(cost1)}</span>
					</span>
				</button>
				<button
					type="button"
					onClick={() => doPull(10)}
					disabled={!canPull10}
					className={`flex-[1.2] py-3.5 px-0 flex flex-col items-center gap-1 relative ${
						canPull10 ? "cursor-pointer" : "cursor-not-allowed"
					}`}
					style={{
						border: `1px solid ${canPull10 ? meta.accent : "var(--rule)"}`,
						color: canPull10 ? "var(--ink-bone)" : "var(--ink-dim)",
						backgroundImage: `linear-gradient(180deg, ${meta.tint}, transparent 80%)`,
					}}
				>
					<span
						className="font-display text-xs tracking-[0.28em]"
						style={{ color: canPull10 ? meta.accent : "var(--ink-dim)" }}
					>
						PULL × 10
					</span>
					<span className="inline-flex items-center gap-1">
						<ResourceIcon
							size={16}
							color={canPull10 ? meta.accent : "var(--ink-dim)"}
						/>
						<span className="font-mono text-xs">{formatNumber(cost10)}</span>
					</span>
					<span className="font-mono absolute top-1.5 right-2 text-[8px] text-dim tracking-widest">
						+1 BONUS
					</span>
				</button>
			</div>

			{revealRelics.length > 0 && (
				<RevealOverlay
					relics={revealRelics}
					onClose={() => {
						setRevealRelics([]);
						clearLastPulled();
					}}
				/>
			)}
		</div>
	);
}
