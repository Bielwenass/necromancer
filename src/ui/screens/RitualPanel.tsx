import { useEffect, useState } from "react";
import { POOL_CONFIGS } from "../../game/gacha";
import { useGameStore } from "../../game/store";
import type { PoolId, Rarity, Relic } from "../../game/types";
import { IconBone, IconCoin, IconSoul } from "../components/Icons";
import { RelicGlyph } from "../components/RelicGlyph";
import { formatNumber, rarityColor, rarityName } from "../theme";
import { RevealOverlay } from "./RevealOverlay";

const POOL_META: Record<
	PoolId,
	{
		name: string;
		kicker: string;
		blurb: string;
		glyph: string;
		accent: string;
		premium: boolean;
		featured: boolean;
		pityMax: number;
		pityGuaranteed: Rarity | null;
	}
> = {
	bone: {
		name: "Bone Ritual",
		kicker: "I · ATTUNED",
		blurb:
			"A simple summons. The graveyards yield bones, the bones yield more.",
		glyph: "hex",
		accent: "var(--c-bone)",
		premium: false,
		featured: false,
		pityMax: 0,
		pityGuaranteed: null,
	},
	soul: {
		name: "Soul Ritual",
		kicker: "II · BOUND",
		blurb: "Wisps of the recently-departed coalesce around the brazier.",
		glyph: "star",
		accent: "var(--c-soul)",
		premium: false,
		featured: true,
		pityMax: 20,
		pityGuaranteed: "rare",
	},
	forbidden: {
		name: "Forbidden Ritual",
		kicker: "III · BLASPHEMOUS",
		blurb:
			"Names that should not be spoken. The price is steep; the rewards, ruinous.",
		glyph: "moon",
		accent: "var(--c-coin)",
		premium: true,
		featured: false,
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
			className={`flex-1 border-r border-[color:var(--rule)] py-8 px-7 flex flex-col relative ${
				meta.featured
					? "bg-[linear-gradient(180deg,#1a140d_0%,#0e0b07_70%)]"
					: "bg-[linear-gradient(180deg,#15110b_0%,#0e0b07_80%)]"
			}`}
		>
			{meta.premium &&
				[0, 1, 2, 3].map((i) => {
					const posClass =
						i === 0
							? "top-3 left-3"
							: i === 1
								? "top-3 right-3"
								: i === 2
									? "bottom-3 left-3"
									: "bottom-3 right-3";
					return (
						<div
							key={i}
							className={`absolute w-[18px] h-[18px] ${posClass}`}
							style={{
								borderTop: i < 2 ? `1px solid ${meta.accent}` : "none",
								borderBottom: i >= 2 ? `1px solid ${meta.accent}` : "none",
								borderLeft: i % 2 === 0 ? `1px solid ${meta.accent}` : "none",
								borderRight: i % 2 === 1 ? `1px solid ${meta.accent}` : "none",
							}}
						/>
					);
				})}

			<div
				className="font-mono text-[10px] tracking-[0.32em] opacity-[0.85]"
				style={{ color: meta.accent }}
			>
				{meta.kicker}
			</div>
			<div className="font-display text-3xl text-bone tracking-[0.18em] mt-3 uppercase">
				{meta.name}
			</div>
			<div
				className="w-15 h-px mt-3.5 opacity-60"
				style={{ background: meta.accent }}
			/>
			<div className="font-body text-sm text-parchm italic mt-4 leading-normal">
				{meta.blurb}
			</div>

			<div
				className="cornered mt-7 h-[180px] flex items-center justify-center relative opacity-95 border bg-[radial-gradient(ellipse_at_50%_60%,rgba(212,168,87,0.04),transparent_70%)]"
				style={{ borderColor: meta.accent }}
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
				<div className="font-mono absolute top-2.5 left-3 text-[9px] text-dim tracking-[0.14em]">
					{poolId.toUpperCase()} POOL
				</div>
			</div>

			<div className="mt-5">
				<div className="flex justify-between mb-2">
					<span className="font-display text-[10px] text-parchm tracking-[0.22em] uppercase">
						Drop Odds
					</span>
					<span className="font-mono text-[9px] text-dim">BASE</span>
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
							size={14}
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
					} ${
						meta.featured
							? "bg-[linear-gradient(180deg,rgba(155,122,214,0.08),transparent_80%)]"
							: "bg-[linear-gradient(180deg,rgba(212,168,87,0.06),transparent_80%)]"
					}`}
					style={{
						border: `1px solid ${canPull10 ? meta.accent : "var(--rule)"}`,
						color: canPull10 ? "var(--ink-bone)" : "var(--ink-dim)",
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
							size={14}
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
