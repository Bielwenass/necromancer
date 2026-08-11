import { UPGRADE_NODES } from "../../game/data/upgrades";
import type { UpgradeNode } from "../../game/types";
import { NodeIcon } from "../components/Icons";

export const BRANCHES: {
	id: string;
	name: string;
	epigraph: string;
	accent: string;
	nodePrefix: string;
}[] = [
	{
		id: "summoning",
		name: "Summoning",
		epigraph: "Multiply the dead.",
		accent: "var(--c-bone)",
		nodePrefix: "s",
	},
	{
		id: "command",
		name: "Command",
		epigraph: "Direct them with iron will.",
		accent: "var(--c-coin)",
		nodePrefix: "c",
	},
	{
		id: "necromancy",
		name: "Necromancy",
		epigraph: "Wield death itself.",
		accent: "var(--c-soul)",
		nodePrefix: "n",
	},
];

export function BranchColumn({
	branch,
	idx,
	purchased,
	filter,
	availablePoints,
	selectedNode,
	onSelectNode,
}: {
	branch: (typeof BRANCHES)[0];
	idx: number;
	purchased: string[];
	filter: "all" | "affordable" | "purchased";
	availablePoints: number;
	selectedNode: UpgradeNode | null;
	onSelectNode: (n: UpgradeNode | null) => void;
}) {
	const branchNodes = UPGRADE_NODES.filter((n) => n.branch === branch.id);
	const edges = branchNodes.flatMap(
		(n) =>
			n.unlocks
				.map((unlockId) => {
					const child = UPGRADE_NODES.find(
						(c) => c.id === unlockId && c.branch === branch.id,
					);
					if (!child) return null;
					return [n.id, child.id] as [string, string];
				})
				.filter(Boolean) as [string, string][],
	);

	const W = 420,
		H = 960;

	const nodeState = (n: UpgradeNode): "purchased" | "unlocked" | "locked" => {
		if (purchased.includes(n.id)) return "purchased";
		const prereqsMet = n.prerequisites.every((p) => purchased.includes(p));
		if (prereqsMet) return "unlocked";
		return "locked";
	};

	const filteredNodes = branchNodes.filter((n) => {
		const state = nodeState(n);
		if (filter === "purchased") return state === "purchased";
		if (filter === "affordable")
			return state === "unlocked" && availablePoints >= n.cost;
		return true;
	});

	return (
		<div
			className={`flex-1 pt-5 relative ${idx < 2 ? "border-r border-rule" : ""}`}
		>
			<div className="text-center mb-[10px]">
				<div className="mono text-[9px] text-dim tracking-[0.24em]">
					BRANCH {["I", "II", "III"][idx]}
				</div>
				<div className="display text-2xl text-bone !tracking-[0.28em] uppercase mt-1">
					{branch.name}
				</div>
				<div className="font-body italic text-xs text-muted mt-1">
					{branch.epigraph}
				</div>
				<div className="flex gap-[3px] justify-center mt-3">
					{branchNodes.map((n) => (
						<div
							key={n.id}
							className="w-3 h-[3px]"
							style={{
								background: purchased.includes(n.id)
									? branch.accent
									: "var(--rule)",
							}}
						/>
					))}
				</div>
			</div>

			<svg
				aria-hidden="true"
				viewBox={`-${W / 2} 0 ${W} ${H}`}
				width="100%"
				height={H}
				className="block"
			>
				{edges.map(([aId, bId]) => {
					const na = branchNodes.find((n) => n.id === aId);
					const nb = branchNodes.find((n) => n.id === bId);
					if (!na || !nb) return null;
					const stateA = nodeState(na);
					const stateB = nodeState(nb);
					const bothPurchased =
						stateA === "purchased" && stateB === "purchased";
					const oneUnlocked = stateA === "purchased" && stateB === "unlocked";
					const bothLocked = stateA === "locked" || stateB === "locked";
					const stroke = bothLocked
						? "rgba(212,184,140,0.18)"
						: bothPurchased
							? branch.accent
							: oneUnlocked
								? branch.accent
								: "rgba(212,184,140,0.18)";
					const w = bothPurchased ? 1.5 : oneUnlocked ? 1 : 0.8;
					const dash = bothLocked ? "3 5" : "";
					return (
						<line
							key={`${aId}-${bId}`}
							x1={na.x}
							y1={na.y}
							x2={nb.x}
							y2={nb.y}
							stroke={stroke}
							strokeWidth={w}
							strokeDasharray={dash}
							opacity={bothLocked ? 0.4 : 1}
						/>
					);
				})}

				{branchNodes.map((n) => {
					const state = nodeState(n);
					const isVisible = filter === "all" || filteredNodes.includes(n);
					const isSelected = selectedNode?.id === n.id;
					const r = n.capstone ? 30 : 22;
					const ringColor =
						state === "purchased"
							? branch.accent
							: state === "unlocked"
								? branch.accent
								: "var(--ink-faint)";
					const opacity = !isVisible ? 0.2 : state === "locked" ? 0.4 : 1;
					const iconColor =
						state === "purchased"
							? "var(--bg-canvas)"
							: state === "unlocked"
								? branch.accent
								: "var(--ink-dim)";
					const fillColor =
						state === "purchased" ? branch.accent : "var(--bg-canvas)";

					return (
						// biome-ignore lint/a11y/useSemanticElements: <g> is inside an <svg>; a real <button> cannot be nested there.
						<g
							key={n.id}
							transform={`translate(${n.x} ${n.y})`}
							opacity={opacity}
							className={
								state === "locked" ? "cursor-default" : "cursor-pointer"
							}
							role="button"
							aria-label={n.name}
							tabIndex={state === "locked" ? -1 : 0}
							onClick={() => onSelectNode(isSelected ? null : n)}
							onKeyDown={(e) => {
								if (e.key !== "Enter" && e.key !== " ") return;
								e.preventDefault();
								onSelectNode(isSelected ? null : n);
							}}
						>
							{n.capstone && (
								<>
									<circle
										r={r + 8}
										fill="none"
										stroke={ringColor}
										strokeWidth="1"
										opacity="0.5"
									/>
									<circle
										r={r + 12}
										fill="none"
										stroke={ringColor}
										strokeWidth="0.5"
										strokeDasharray="2 4"
										opacity="0.4"
									/>
								</>
							)}
							{state === "unlocked" && (
								<circle
									r={r + 4}
									fill="none"
									stroke={ringColor}
									strokeWidth="1"
									opacity="0.35"
								/>
							)}
							{isSelected && (
								<>
									<circle
										r={r + 6}
										fill="none"
										stroke="var(--c-coin)"
										strokeWidth="1"
									/>
									<circle
										r={r + 8}
										fill="none"
										stroke="var(--c-coin)"
										strokeWidth="0.5"
										opacity="0.5"
									/>
								</>
							)}
							<circle
								r={r}
								fill={fillColor}
								stroke={ringColor}
								strokeWidth={
									state === "purchased" ? 0 : state === "unlocked" ? 2 : 1.2
								}
							/>
							<g className="-translate-x-3.5 -translate-y-3.5">
								<NodeIcon size={28} kind={n.icon} color={iconColor} />
							</g>
							<g transform={`translate(${r - 2} ${-r + 2})`}>
								<rect
									x="-7"
									y="-6"
									width="14"
									height="12"
									fill="var(--bg-canvas)"
									stroke={ringColor}
									strokeWidth="0.5"
								/>
								<text
									textAnchor="middle"
									y="3"
									fontSize="8"
									fontFamily="JetBrains Mono"
									fill={
										state === "locked" ? "var(--ink-dim)" : "var(--ink-bone)"
									}
								>
									{n.tier}
								</text>
							</g>
							{state === "locked" && !n.capstone && (
								<g transform={`translate(-15 18)`}>
									<rect
										x="-4"
										y="-2"
										width="8"
										height="6"
										fill="var(--bg-canvas)"
										stroke="var(--ink-dim)"
										strokeWidth="0.6"
									/>
									<path
										d="M-2 -2 V-4 Q 0 -6 2 -4 V-2"
										fill="none"
										stroke="var(--ink-dim)"
										strokeWidth="0.6"
									/>
								</g>
							)}
							<text
								textAnchor="middle"
								y={r + 22}
								fontSize="10"
								fontFamily="Spectral"
								fill={state === "locked" ? "var(--ink-dim)" : "var(--ink-bone)"}
								letterSpacing="0.04em"
							>
								{n.name}
							</text>
							<text
								textAnchor="middle"
								y={r + 34}
								fontSize="9"
								fontFamily="JetBrains Mono"
								fill={
									state === "locked" ? "var(--ink-faint)" : "var(--ink-muted)"
								}
							>
								{state === "purchased"
									? "— OWNED —"
									: state === "unlocked"
										? `${n.cost} PTS`
										: `PREREQ REQ`}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
