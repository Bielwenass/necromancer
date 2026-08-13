import { useEffect, useState } from "react";
import {
	effectivePityInterval,
	POOL_CONFIGS,
	poolOdds,
} from "../../../game/rules/gacha";
import { useGameStore } from "../../../game/store";
import type { PoolId, Relic } from "../../../game/types";
import { IconBanner, IconCorpse, IconSoul } from "../icons";
import { DropOddsTable } from "./DropOddsTable";
import { PityMeter } from "./PityMeter";
import { PullButton } from "./PullButton";
import { POOL_META } from "./pools";
import { RevealOverlay } from "./RevealOverlay";
import { RitualArt } from "./RitualArt";

export function RitualPanel({ poolId }: { poolId: PoolId }) {
	const meta = POOL_META[poolId];
	const config = POOL_CONFIGS[poolId];
	const resources = useGameStore((s) => s.resources);
	const pull = useGameStore((s) => s.pull);
	const clearLastPulled = useGameStore((s) => s.clearLastPulled);
	const lastPulledRelics = useGameStore((s) => s.gacha.lastPulledRelics);
	const pityCounter = useGameStore((s) => s.gacha.pityCounters[poolId]);
	const freePulls = useGameStore((s) => s.gacha.freePulls);
	const pityReduction = useGameStore((s) => s.derived.pityReduction);

	const [revealRelics, setRevealRelics] = useState<Relic[]>([]);
	const [myPullPending, setMyPullPending] = useState(false);

	const cost1 = config.cost1.amount;
	const cost10 = config.cost10.amount;
	const resource = config.cost1.resource;

	// A Phylactery charge covers a single banner pull, and only that pool.
	const free = poolId === "banner" && freePulls > 0;
	const pityMax = effectivePityInterval(poolId, pityReduction);

	const available = resources[resource];
	const canPull1 = free || available >= cost1;
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
		resource === "banners"
			? IconBanner
			: resource === "corpses"
				? IconCorpse
				: IconSoul;

	return (
		<div
			className="flex-1 border-r border-[color:var(--rule)] py-8 px-7 flex flex-col relative bg-bg-deep max-md:w-full max-md:border-r-0 max-md:border-b max-md:py-6 max-md:px-5"
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
				className="cornered mt-7 h-[180px] relative overflow-hidden opacity-95"
				style={{
					borderColor: meta.accent,
					backgroundImage: `radial-gradient(ellipse at 50% 50%, ${meta.tint}, transparent 70%)`,
				}}
			>
				<div className="relative w-full h-full">
					<RitualArt src={meta.art} color={meta.accent} />
				</div>
			</div>

			<DropOddsTable odds={poolOdds(poolId)} />

			{config.pityRarity && pityMax > 0 && (
				<PityMeter
					counter={pityCounter}
					max={pityMax}
					guaranteed={config.pityRarity}
				/>
			)}

			<div className="mt-auto pt-5 flex gap-2.5">
				<PullButton
					label="PULL"
					cost={free ? 0 : cost1}
					affordable={canPull1}
					accent={meta.accent}
					Icon={ResourceIcon}
					onClick={() => doPull(1)}
					badge={free ? `FREE ×${freePulls}` : undefined}
				/>
				<PullButton
					label="PULL × 10"
					cost={cost10}
					affordable={canPull10}
					accent={meta.accent}
					Icon={ResourceIcon}
					onClick={() => doPull(10)}
					wide
					tint={meta.tint}
					badge="+1 BONUS"
				/>
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
