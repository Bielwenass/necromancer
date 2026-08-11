import { useState } from "react";
import { UPGRADE_NODES } from "../../game/data/upgrades";
import { useGameStore } from "../../game/store";
import type { Resources } from "../../game/types";
import { canPurchaseUpgrade } from "../../game/upgrades";
import {
	CRYPT_CONFIG,
	canAffordCost,
	cryptCost,
	GARDEN_BASE_YIELD,
	GARDEN_PLOT_NAMES,
	gardenCost,
	UNIT_STAT_CONFIG,
	unitStatCost,
} from "../../game/workshopUpgrades";
import { NodeIcon } from "../components/Icons";
import { formatNumber } from "../theme";

const Icon = ({
	kind,
	size = 16,
	color = "currentColor",
}: {
	kind: string;
	size?: number;
	color?: string;
}) => <NodeIcon kind={kind} size={size} color={color} />;

// ─── resource display ─────────────────────────────────────────
const RES: Record<string, { icon: string; color: string; label: string }> = {
	bones: { icon: "bone", color: "var(--c-bone)", label: "Bones" },
	coins: { icon: "circle", color: "var(--c-coin)", label: "Gold" },
	souls: { icon: "soul", color: "var(--c-soul)", label: "Souls" },
	corpses: { icon: "zombie", color: "var(--sq-zombie)", label: "Corpses" },
};

function costLines(cost: Partial<Resources>, res: Resources) {
	return Object.entries(cost)
		.filter(([, v]) => (v ?? 0) > 0)
		.map(([k, v]) => {
			const d = RES[k] ?? { icon: "bone", color: "var(--c-bone)", label: k };
			const ok = (res[k as keyof Resources] ?? 0) >= (v as number);
			return { key: k, amount: v as number, ok, ...d };
		});
}

// ─── types ────────────────────────────────────────────────────
interface WRow {
	id: string;
	name: string;
	description: string;
	flavor?: string;
	icon: string;
	level: number;
	maxLevel?: number;
	locked: boolean;
	unlockText: string;
	costFn: (level: number) => Partial<Resources> | null;
	valueFn: (level: number) => string;
	nextFn: (level: number) => string;
}

interface WSection {
	id: string;
	name: string;
	subtitle: string;
	icon: string;
	unlocked: boolean;
	lockedTitle?: string;
	lockedBody?: string;
	type?: "garden";
	rows?: WRow[];
	gardenLevels?: number[];
}

// ─── section builders ─────────────────────────────────────────
function skillRows(purchased: string[], branch: string): WRow[] {
	return UPGRADE_NODES.filter((n) => n.branch === branch).map(
		(n) =>
			({
				id: n.id,
				name: n.name,
				description: n.description,
				flavor: n.flavor,
				icon: n.icon,
				level: purchased.includes(n.id) ? 1 : 0,
				maxLevel: 1,
				locked:
					!purchased.includes(n.id) &&
					n.prerequisites.some((p) => !purchased.includes(p)),
				unlockText:
					n.prerequisites.length > 0
						? `Requires: ${n.prerequisites.map((p) => UPGRADE_NODES.find((x) => x.id === p)?.name ?? p).join(", ")}`
						: "",
				costFn: (lv) =>
					lv >= 1
						? null
						: ([
								{ bones: 0, coins: 0 },
								{ points: n.cost },
							][1] as unknown as Partial<Resources>),
				valueFn: (lv) => (lv >= 1 ? "Inscribed" : "—"),
				nextFn: (lv) => (lv >= 1 ? "— maxed —" : n.description),
				_isSkill: true,
				_skillId: n.id,
				_skillCost: n.cost,
			}) as WRow & { _isSkill: boolean; _skillId: string; _skillCost: number },
	);
}

function unitRows(
	unit: "skeleton" | "zombie" | "wraith",
	levels: { hp: number; dmg: number; speed: number },
): WRow[] {
	const cfg = UNIT_STAT_CONFIG[unit];
	return (["hp", "dmg", "speed"] as const).map((stat) => {
		const c = cfg[stat];
		const lv = levels[stat];
		return {
			id: `${unit}.${stat}`,
			name: `${unit.charAt(0).toUpperCase() + unit.slice(1)} ${c.label}`,
			description: `+${c.perLevel} ${c.label} per level (base ${c.base})`,
			icon: stat === "hp" ? "heal" : stat === "dmg" ? "aggro" : "fast",
			level: lv,
			locked: false,
			unlockText: "",
			costFn: () => unitStatCost(unit, stat, lv),
			valueFn: (l) => `${c.base + l * c.perLevel}`,
			nextFn: (l) => `${c.base + (l + 1) * c.perLevel}`,
		};
	});
}

function cryptRows(crypt: { squadSize: number; travelSpeed: number }): WRow[] {
	return [
		{
			id: "crypt.squadSize",
			name: "Squad Capacity",
			icon: "army",
			description: CRYPT_CONFIG.squadSize.label,
			level: crypt.squadSize,
			locked: false,
			unlockText: "",
			flavor: "More bodies for the march.",
			costFn: () => cryptCost("squadSize", crypt.squadSize),
			valueFn: (l) => `+${l}`,
			nextFn: (l) => `+${l + 1}`,
		},
		{
			id: "crypt.travelSpeed",
			name: "March Speed",
			icon: "retreat",
			description: CRYPT_CONFIG.travelSpeed.label,
			level: crypt.travelSpeed,
			locked: false,
			unlockText: "",
			costFn: () => cryptCost("travelSpeed", crypt.travelSpeed),
			valueFn: (l) => `+${l * 8}%`,
			nextFn: (l) => `+${(l + 1) * 8}%`,
		},
	];
}

function buildSections(
	purchased: string[],
	ws: {
		skeleton: { hp: number; dmg: number; speed: number };
		zombie: { hp: number; dmg: number; speed: number };
		wraith: { hp: number; dmg: number; speed: number };
		crypt: { squadSize: number; travelSpeed: number };
		garden: number[];
	},
	zombiesUnlocked: boolean,
	wraithsUnlocked: boolean,
): WSection[] {
	return [
		{
			id: "summoning",
			name: "Summoning",
			subtitle: "One-time summon enhancements.",
			icon: "army",
			unlocked: true,
			rows: skillRows(purchased, "summoning"),
		},
		{
			id: "command",
			name: "Command",
			subtitle: "One-time battlefield enhancements.",
			icon: "auto",
			unlocked: true,
			rows: skillRows(purchased, "command"),
		},
		{
			id: "necromancy",
			name: "Necromancy",
			subtitle: "One-time dark arts enhancements.",
			icon: "soul",
			unlocked: true,
			rows: skillRows(purchased, "necromancy"),
		},
		{
			id: "skeletons",
			name: "Skeletons",
			subtitle: "Leveled stat upgrades for skeletons.",
			icon: "bone",
			unlocked: true,
			rows: unitRows("skeleton", ws.skeleton),
		},
		{
			id: "zombies",
			name: "Zombies",
			subtitle: "Leveled stat upgrades for zombies.",
			icon: "zombie",
			unlocked: zombiesUnlocked,
			lockedTitle: "Zombies Locked",
			lockedBody: "Unlock via Summoning branch.",
			rows: unitRows("zombie", ws.zombie),
		},
		{
			id: "wraiths",
			name: "Wraiths",
			subtitle: "Leveled stat upgrades for wraiths.",
			icon: "wraith",
			unlocked: wraithsUnlocked,
			lockedTitle: "Wraiths Locked",
			lockedBody: "Unlock via Summoning branch.",
			rows: unitRows("wraith", ws.wraith),
		},
		{
			id: "crypt",
			name: "Crypt",
			subtitle: "Infinite upgrades for your crypt.",
			icon: "domain",
			unlocked: true,
			rows: cryptRows(ws.crypt),
		},
		{
			id: "garden",
			name: "Garden",
			subtitle: "Purchase and upgrade bone plots.",
			icon: "aura",
			unlocked: true,
			type: "garden",
			gardenLevels: ws.garden,
		},
	];
}

// ─── SideNav ─────────────────────────────────────────────────
function SideNav({
	sections,
	activeId,
	onSelect,
	anyDot,
}: {
	sections: WSection[];
	activeId: string;
	onSelect: (id: string) => void;
	anyDot: Record<string, boolean>;
}) {
	return (
		<div className="w-[280px] min-w-[280px] border-r border-[color:var(--rule)] bg-bg-panel flex flex-col overflow-y-auto">
			<div className="pt-4 px-5 pb-3 border-b border-[color:var(--rule)]">
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					Crypt Workshop
				</div>
			</div>
			{sections.map((s) => (
				<button
					type="button"
					key={s.id}
					className={
						"flex items-center gap-3.5 pt-3.5 pb-3.5 pr-5 border-b border-[color:var(--rule)] text-left w-full transition-colors duration-[120ms] " +
						(s.id === activeId
							? "bg-[rgba(214,122,48,0.07)] border-l-2 border-l-ember pl-5"
							: "pl-[22px] hover:bg-bg-hover ") +
						(!s.unlocked ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
					}
					onClick={() => s.unlocked && onSelect(s.id)}
				>
					<div className="flex items-center">
						<Icon
							kind={s.unlocked ? s.icon : "forbid"}
							size={18}
							color={
								s.id === activeId
									? "var(--c-ember)"
									: s.unlocked
										? "var(--ink-parchm)"
										: "var(--ink-dim)"
							}
						/>
					</div>
					<div className="font-display text-xs tracking-[0.2em] uppercase flex-1 text-parchm">
						{s.name}
					</div>
					{anyDot[s.id] && (
						<div className="w-[7px] h-[7px] rounded-full bg-ember shadow-[0_0_5px_var(--c-ember)]" />
					)}
				</button>
			))}
		</div>
	);
}

// ─── UpgRow ──────────────────────────────────────────────────
function UpgRow({
	row,
	res,
	pts,
	focused,
	onFocus,
	onBuy,
	isSkill,
	skillCost,
}: {
	row: WRow;
	res: Resources;
	pts: number;
	focused: boolean;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
	isSkill?: boolean;
	skillCost?: number;
}) {
	if (row.locked)
		return (
			<div className="grid grid-cols-[48px_1fr_90px_90px] items-center gap-4 px-8 py-4 border-b border-[color:var(--rule)] opacity-50 cursor-default">
				<div className="flex items-center justify-center">
					<Icon kind="forbid" size={22} color="var(--ink-dim)" />
				</div>
				<div>
					<div className="font-display text-sm tracking-[0.12em] text-muted">
						{row.name}
					</div>
					<div className="text-xs text-muted mt-[3px] leading-snug">
						{row.unlockText}
					</div>
				</div>
				<div className="text-right">
					<div className="font-mono text-[10px] tracking-[0.16em] text-dim">
						LOCKED
					</div>
				</div>
				<div />
			</div>
		);

	const maxed = row.maxLevel !== undefined && row.level >= row.maxLevel;
	const cost = maxed ? null : isSkill ? null : row.costFn(row.level);
	const affordable = maxed
		? false
		: isSkill
			? pts >= (skillCost ?? 0)
			: cost
				? canAffordCost(cost, res)
				: false;
	const valueNumerical = Math.round(Number(row.valueFn(row.level)) * 100) / 100;

	return (
		<button
			type="button"
			className={`grid grid-cols-[48px_1fr_90px_90px] items-center gap-4 py-4 w-full text-left transition-colors duration-100 border-b border-[color:var(--rule)] ${
				focused
					? "bg-bg-hover border-l-2 border-l-ember pl-[30px] pr-8"
					: "px-8 hover:bg-bg-hover"
			}`}
			onMouseEnter={() => onFocus(row.id)}
			onClick={() => onFocus(row.id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (!maxed && affordable) onBuy(row.id);
			}}
		>
			<div className="flex items-center justify-center">
				<Icon
					kind={row.icon}
					size={26}
					color={maxed ? "var(--hp-good)" : "var(--c-bone)"}
				/>
			</div>
			<div>
				<div className="font-display text-sm tracking-[0.12em] text-bone">
					{row.name}
				</div>
				<div className="text-xs text-muted mt-[3px] leading-snug">
					{row.description}
				</div>
			</div>
			<div className="text-right">
				<div
					className={`font-mono text-[10px] tracking-[0.16em] ${maxed ? "text-hp-good" : "text-ember"}`}
				>
					{maxed ? "DONE" : `LV ${row.level}`}
				</div>
				<div className="font-mono text-[11px] text-parchm mt-0.5">
					{valueNumerical ? valueNumerical : row.valueFn(row.level)}
				</div>
			</div>
			<div className="text-right">
				{maxed ? (
					<div className="font-mono text-[9px] tracking-[0.12em] text-hp-good">
						MAXED
					</div>
				) : isSkill ? (
					<>
						<div className="font-mono text-[9px] tracking-[0.14em] text-dim mb-1">
							Points
						</div>
						<div
							className={`flex items-center gap-1.5 justify-end font-mono text-[11px] ${affordable ? "text-parchm" : "text-hp-crit"}`}
						>
							<Icon
								kind="triple"
								size={12}
								color={affordable ? "var(--c-coin)" : "var(--hp-crit)"}
							/>
							<span>{skillCost}</span>
						</div>
					</>
				) : cost ? (
					costLines(cost, res).map((cl) => (
						<div
							key={cl.key}
							className={`flex items-center gap-1.5 justify-end font-mono text-[11px] ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
						>
							<Icon
								kind={cl.icon}
								size={12}
								color={cl.ok ? cl.color : "var(--hp-crit)"}
							/>
							<span>{cl.amount.toLocaleString()}</span>
						</div>
					))
				) : null}
			</div>
		</button>
	);
}

// ─── Garden plot card ─────────────────────────────────────────
function PlotCard({
	idx,
	level,
	res,
	focused,
	onFocus,
	onBuy,
}: {
	idx: number;
	level: number;
	res: Resources;
	focused: boolean;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
}) {
	const id = `garden.${idx}`;
	const cost = gardenCost(level);
	const canBuy = canAffordCost(cost, res);
	const yieldNow = (GARDEN_BASE_YIELD * level).toFixed(2);
	const costEntry = costLines(cost, res);
	return (
		<button
			type="button"
			className={`border bg-bg-panel-2 p-3.5 cursor-pointer transition-colors duration-[120ms] flex flex-col gap-2.5 text-left w-full ${
				focused
					? "border-ember"
					: "border-[color:var(--rule)] hover:border-ember"
			}`}
			onMouseEnter={() => onFocus(id)}
			onClick={() => onFocus(id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (canBuy) onBuy(id);
			}}
		>
			<div className="flex items-center gap-2">
				<div
					className={`w-[7px] h-[7px] rounded-full shrink-0 ${canBuy ? "bg-ember" : "bg-dim"}`}
				/>
				<div className="font-display text-[11px] tracking-[0.16em] uppercase text-parchm">
					{GARDEN_PLOT_NAMES[idx]}
				</div>
			</div>
			<div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 items-baseline">
				<div className="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">
					YIELD
				</div>
				<div className="font-mono text-xs text-parchm">{yieldNow}/s</div>
				<div className="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">
					LEVEL
				</div>
				<div className="font-mono text-xs text-parchm">LV {level}</div>
			</div>
			<div className="flex flex-col gap-[3px] mt-0.5 border-t border-[color:var(--rule)] pt-2">
				{level === 0 && (
					<div className="font-mono text-[9px] text-dim tracking-[0.12em] mb-1">
						PURCHASE
					</div>
				)}
				{costEntry.map((cl) => (
					<div
						key={cl.key}
						className={`flex items-center gap-[5px] font-mono text-[10px] ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
					>
						<Icon
							kind={cl.icon}
							size={11}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<span>{cl.amount.toLocaleString()}</span>
					</div>
				))}
			</div>
		</button>
	);
}

// ─── Detail (right panel) ────────────────────────────────────
function Detail({
	rowId,
	sections,
	res,
	pts,
	onBuy,
	onSkillBuy,
	gameState,
}: {
	rowId: string | null;
	sections: WSection[];
	res: Resources;
	pts: number;
	onBuy: (id: string) => void;
	onSkillBuy: (id: string) => void;
	gameState: Parameters<typeof canPurchaseUpgrade>[0];
}) {
	// Find the row or plot across all sections
	let row: WRow | null = null;
	let isSkill = false;
	let skillCost = 0;
	let gardenIdx = -1;

	if (rowId?.startsWith("garden.")) {
		gardenIdx = parseInt(rowId.split(".")[1], 10);
	} else if (rowId) {
		for (const s of sections) {
			const found = s.rows?.find((r) => r.id === rowId);
			if (found) {
				row = found;
				const ext = found as WRow & { _isSkill?: boolean; _skillCost?: number };
				isSkill = ext._isSkill ?? false;
				skillCost = ext._skillCost ?? 0;
				break;
			}
		}
	}

	if (gardenIdx >= 0) {
		const gardenSection = sections.find((s) => s.id === "garden");
		const level = gardenSection?.gardenLevels?.[gardenIdx] ?? 0;
		const cost = gardenCost(level);
		const canBuy = canAffordCost(cost, res);
		const yieldNow = (GARDEN_BASE_YIELD * level).toFixed(2);
		const yieldNext = (GARDEN_BASE_YIELD * (level + 1)).toFixed(2);
		return (
			<div className="flex flex-col gap-[18px]">
				<div>
					<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
						Bone Garden Plot
					</div>
					<div className="font-display text-2xl tracking-wider text-bone mt-2">
						{GARDEN_PLOT_NAMES[gardenIdx]}
					</div>
					<div className="font-mono text-[10px] text-ember tracking-[0.2em] mt-2">
						LV {level}
					</div>
				</div>
				<div>
					<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
						Yield
					</div>
					<div className="flex items-baseline gap-3.5 py-2.5">
						<span className="font-display text-2xl text-bone">
							{yieldNow}/s
						</span>
						<span className="font-mono text-base text-dim">→</span>
						<span className="font-display text-2xl text-ember">
							{yieldNext}/s
						</span>
					</div>
				</div>
				<CostBlock cost={cost} res={res} />
				<button
					type="button"
					className="block w-full py-3 border border-ember bg-[rgba(214,122,48,0.06)] text-ember font-display text-[11px] tracking-[0.22em] uppercase cursor-pointer transition-colors duration-[120ms] hover:enabled:bg-[rgba(214,122,48,0.14)] disabled:border-[color:var(--rule-strong)] disabled:text-dim disabled:bg-transparent disabled:cursor-not-allowed"
					disabled={!canBuy || !rowId}
					onClick={() => rowId && onBuy(rowId)}
				>
					{level === 0
						? "Purchase Plot"
						: canBuy
							? `Upgrade to LV ${level + 1}`
							: "Insufficient"}
				</button>
			</div>
		);
	}

	if (!row)
		return (
			<div className="font-mono text-[10px] text-dim tracking-[0.14em] text-center mt-10">
				HOVER A ROW TO SEE DETAILS
			</div>
		);

	if (row.locked)
		return (
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-1.5">
					Locked
				</div>
				<div className="font-display text-2xl text-parchm tracking-widest">
					{row.name}
				</div>
				<div className="mt-3.5 p-4 border border-[color:var(--rule)] bg-bg-inset text-muted font-body italic text-sm leading-normal">
					{row.unlockText}
				</div>
			</div>
		);

	const maxed = row.maxLevel !== undefined && row.level >= row.maxLevel;
	const cost = maxed ? null : isSkill ? null : row.costFn(row.level);
	const canBuy = maxed
		? false
		: isSkill
			? canPurchaseUpgrade(
					gameState,
					(row as WRow & { _skillId: string })._skillId ?? row.id,
				)
			: cost
				? canAffordCost(cost, res)
				: false;
	const valueNumerical = Math.round(Number(row.valueFn(row.level)) * 100) / 100;
	const valueNextNumerical =
		Math.round(Number(row.nextFn(row.level)) * 100) / 100;

	return (
		<div className="flex flex-col gap-[18px]">
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					{isSkill ? "One-time Upgrade" : "Leveled Upgrade"}
				</div>
				<div className="font-display text-2xl text-bone tracking-wider mt-2 leading-tight">
					{row.name}
				</div>
				<div
					className={`font-mono text-[10px] tracking-[0.2em] mt-2 ${maxed ? "text-hp-good" : "text-ember"}`}
				>
					{maxed ? "INSCRIBED" : `LV ${row.level}`}
				</div>
			</div>
			<div className="p-4 border border-[color:var(--rule)] bg-bg-inset font-body text-sm text-parchm leading-relaxed">
				{row.description}
			</div>
			{row.flavor && (
				<div className="font-body italic text-sm text-muted leading-normal">
					"{row.flavor}"
				</div>
			)}
			{!maxed && (
				<div>
					<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
						Current → Next
					</div>
					<div className="flex items-baseline gap-3.5 py-2.5">
						<span className="font-display text-2xl text-bone">
							{valueNumerical ? valueNumerical : row.valueFn(row.level)}
						</span>
						<span className="font-mono text-base text-dim">→</span>
						<span className="font-display text-2xl text-ember">
							{valueNextNumerical ? valueNextNumerical : row.nextFn(row.level)}
						</span>
					</div>
				</div>
			)}
			{!maxed &&
				(isSkill ? (
					<PointsCostBlock skillCost={skillCost} pts={pts} />
				) : (
					cost && <CostBlock cost={cost} res={res} />
				))}
			{!maxed && (
				<button
					type="button"
					className="block w-full py-3 border border-ember bg-[rgba(214,122,48,0.06)] text-ember font-display text-[11px] tracking-[0.22em] uppercase cursor-pointer transition-colors duration-[120ms] hover:enabled:bg-[rgba(214,122,48,0.14)] disabled:border-[color:var(--rule-strong)] disabled:text-dim disabled:bg-transparent disabled:cursor-not-allowed"
					disabled={!canBuy}
					onClick={() =>
						isSkill
							? onSkillBuy(
									(row as WRow & { _skillId: string })._skillId ?? row.id,
								)
							: onBuy(row.id)
					}
				>
					{canBuy
						? isSkill
							? "Inscribe"
							: `Upgrade → LV ${row.level + 1}`
						: "Insufficient"}
				</button>
			)}
			{maxed && (
				<div className="p-3.5 border border-hp-good bg-[rgba(111,169,98,0.06)] text-center">
					<div className="font-mono text-[10px] text-hp-good tracking-[0.16em]">
						INSCRIBED · ACTIVE
					</div>
				</div>
			)}
		</div>
	);
}

function CostBlock({
	cost,
	res,
}: {
	cost: Partial<Resources>;
	res: Resources;
}) {
	const lines = costLines(cost, res);
	return (
		<div>
			<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
				Cost
			</div>
			<div className="border border-[color:var(--rule)] bg-bg-inset px-3.5">
				{lines.map((cl) => (
					<div
						key={cl.key}
						className={`flex items-center gap-2.5 py-2.5 border-b border-[color:var(--rule)] last:border-b-0 font-mono text-xs ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
					>
						<Icon
							kind={cl.icon}
							size={18}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<div className="flex-1 text-[11px] tracking-[0.1em]">
							{cl.label}
						</div>
						<div className="text-dim min-w-[50px]">
							{formatNumber(
								Math.floor(res[cl.key as keyof Resources] as number),
							)}
						</div>
						<div className="min-w-[40px] text-right">
							/ {formatNumber(cl.amount)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function PointsCostBlock({
	skillCost,
	pts,
}: {
	skillCost: number;
	pts: number;
}) {
	const ok = pts >= skillCost;
	return (
		<div>
			<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
				Cost
			</div>
			<div className="border border-[color:var(--rule)] bg-bg-inset px-3.5">
				<div
					className={`flex items-center gap-2.5 py-2.5 font-mono text-xs ${ok ? "text-parchm" : "text-hp-crit"}`}
				>
					<Icon
						kind="triple"
						size={18}
						color={ok ? "var(--c-coin)" : "var(--hp-crit)"}
					/>
					<div className="flex-1 text-[11px] tracking-[0.1em]">
						Skill Points
					</div>
					<div className="min-w-[40px] text-right">{skillCost}</div>
					<div className="text-dim min-w-[50px]">/ {pts}</div>
					<div className="min-w-[18px] text-center text-xs">
						{ok ? "✓" : "✗"}
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Workshop ─────────────────────────────────────────────────
export function Workshop() {
	const purchased = useGameStore((s) => s.upgrades.purchased);
	const pts = useGameStore((s) => s.upgrades.availablePoints);
	const ws = useGameStore((s) => s.workshop);
	const res = useGameStore((s) => s.resources);
	const zombiesUnlocked = useGameStore((s) => s.derived.zombiesUnlocked);
	const wraithsUnlocked = useGameStore((s) => s.derived.wraithsUnlocked);
	const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
	const levelUpWorkshop = useGameStore((s) => s.levelUpWorkshop);
	const gameState = useGameStore((s) => s);

	const sections = buildSections(
		purchased,
		ws,
		zombiesUnlocked,
		wraithsUnlocked,
	);
	const [activeId, setActiveId] = useState("summoning");
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const active = sections.find((s) => s.id === activeId) ?? sections[0];

	const anyDot: Record<string, boolean> = {};
	sections.forEach((s) => {
		if (!s.unlocked) {
			anyDot[s.id] = false;
			return;
		}
		if (s.type === "garden") {
			anyDot[s.id] = (s.gardenLevels ?? []).some(
				(lv, i) =>
					canAffordCost(gardenCost(lv), res) && i < GARDEN_PLOT_NAMES.length,
			);
		} else {
			anyDot[s.id] = (s.rows ?? []).some((r) => {
				if (r.locked) return false;
				const ext = r as WRow & { _isSkill?: boolean; _skillCost?: number };
				if (ext._isSkill) return pts >= (ext._skillCost ?? 0) && r.level === 0;
				const cost = r.costFn(r.level);
				return cost !== null && canAffordCost(cost, res);
			});
		}
	});

	const gardenTotalYield = (
		ws.garden.reduce((s: number, l: number) => s + l, 0) * GARDEN_BASE_YIELD
	).toFixed(2);

	return (
		<div className="flex size-full">
			<SideNav
				sections={sections}
				activeId={activeId}
				onSelect={(id) => {
					setActiveId(id);
					setFocusedId(null);
				}}
				anyDot={anyDot}
			/>

			<div className="flex-1 overflow-y-auto flex flex-col">
				<div className="px-8 pt-6 pb-5 border-b border-[color:var(--rule)] shrink-0">
					<div className="flex items-end gap-[22px] mt-2.5">
						<Icon
							kind={active.icon}
							size={44}
							color={active.unlocked ? "var(--ink-bone)" : "var(--ink-dim)"}
						/>
						<div>
							<div className="font-display text-4xl text-bone tracking-[0.16em] uppercase leading-none">
								{active.name}
							</div>
							<div className="font-body italic text-sm text-parchm mt-1.5">
								{active.subtitle}
							</div>
						</div>
					</div>
				</div>

				{!active.unlocked && (
					<div className="flex items-start gap-[18px] p-6 my-4 mx-8 border border-[color:var(--rule)] bg-bg-inset">
						<div className="pt-0.5">
							<Icon kind="forbid" size={26} color="var(--ink-dim)" />
						</div>
						<div>
							<h3 className="text-sm text-muted tracking-[0.12em] mb-2">
								{active.lockedTitle}
							</h3>
							<p className="text-[13px] text-dim font-body italic leading-relaxed">
								{active.lockedBody}
							</p>
						</div>
					</div>
				)}

				{active.unlocked && active.type === "garden" && (
					<>
						<div className="py-2.5 px-8 border-b border-[color:var(--rule)] flex items-center gap-4 shrink-0 min-h-[44px]">
							<div className="font-mono text-[10px] tracking-[0.16em] text-dim whitespace-nowrap">
								Garden Yield
							</div>
							<div className="font-mono text-sm text-bone">
								{gardenTotalYield}{" "}
								<span className="text-[10px] text-dim">BONES/SEC</span>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-3.5 py-5 px-8">
							{(active.gardenLevels ?? []).map((lv, i) => (
								<PlotCard
									key={GARDEN_PLOT_NAMES[i]}
									idx={i}
									level={lv}
									res={res}
									focused={focusedId === `garden.${i}`}
									onFocus={setFocusedId}
									onBuy={levelUpWorkshop}
								/>
							))}
						</div>
					</>
				)}

				{active.unlocked && active.type !== "garden" && (
					<div>
						{(active.rows ?? []).map((r) => {
							const ext = r as WRow & {
								_isSkill?: boolean;
								_skillCost?: number;
							};
							return (
								<UpgRow
									key={r.id}
									row={r}
									res={res}
									pts={pts}
									focused={r.id === focusedId}
									onFocus={setFocusedId}
									onBuy={levelUpWorkshop}
									isSkill={ext._isSkill}
									skillCost={ext._skillCost}
								/>
							);
						})}
					</div>
				)}
			</div>

			<div className="w-[360px] min-w-[360px] border-l border-[color:var(--rule)] bg-bg-panel px-5 py-6 overflow-y-auto flex flex-col gap-5">
				<Detail
					rowId={focusedId}
					sections={sections}
					res={res}
					pts={pts}
					onBuy={levelUpWorkshop}
					onSkillBuy={purchaseUpgrade}
					gameState={gameState}
				/>
				<div className="mt-auto p-3.5 border border-[color:var(--rule)] bg-bg-inset">
					<div className="font-mono text-[10px] text-dim tracking-[0.14em] leading-relaxed">
						HOVER A ROW TO SEE DETAILS.
						<br />
						RIGHT-CLICK TO UPGRADE INSTANTLY.
					</div>
				</div>
			</div>
		</div>
	);
}
