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
		<div className="wkshp-nav">
			<div
				style={{
					padding: "16px 20px 12px",
					borderBottom: "1px solid var(--rule)",
				}}
			>
				<div className="eyebrow-sm">Crypt Workshop</div>
			</div>
			{sections.map((s) => (
				<button
					type="button"
					key={s.id}
					className={
						"wkshp-nav-item text-left" +
						(s.id === activeId ? " active" : "") +
						(!s.unlocked ? " locked" : "")
					}
					onClick={() => s.unlocked && onSelect(s.id)}
				>
					<div className="nav-icon">
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
					<div className="nav-name">{s.name}</div>
					{anyDot[s.id] && <div className="nav-dot" />}
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
			<div className="upg-row" style={{ opacity: 0.5, cursor: "default" }}>
				<div className="upg-icon">
					<Icon kind="forbid" size={22} color="var(--ink-dim)" />
				</div>
				<div>
					<div className="upg-name" style={{ color: "var(--ink-muted)" }}>
						{row.name}
					</div>
					<div className="upg-desc">{row.unlockText}</div>
				</div>
				<div className="upg-current">
					<div className="lv" style={{ color: "var(--ink-dim)" }}>
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
			className={`upg-row w-full text-left${focused ? " focused" : ""}`}
			onMouseEnter={() => onFocus(row.id)}
			onClick={() => onFocus(row.id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (!maxed && affordable) onBuy(row.id);
			}}
		>
			<div className="upg-icon">
				<Icon
					kind={row.icon}
					size={26}
					color={maxed ? "var(--hp-good)" : "var(--c-bone)"}
				/>
			</div>
			<div>
				<div className="upg-name">{row.name}</div>
				<div className="upg-desc">{row.description}</div>
			</div>
			<div className="upg-current">
				<div className="lv" style={maxed ? { color: "var(--hp-good)" } : {}}>
					{maxed ? "DONE" : `LV ${row.level}`}
				</div>
				<div className="upg-val">
					{valueNumerical ? valueNumerical : row.valueFn(row.level)}
				</div>
			</div>
			<div className="upg-cost">
				{maxed ? (
					<div
						className="mono"
						style={{
							fontSize: 9,
							color: "var(--hp-good)",
							letterSpacing: "0.12em",
						}}
					>
						MAXED
					</div>
				) : isSkill ? (
					<>
						<div className="cost-label">Points</div>
						<div className={`cost-line ${affordable ? "ok" : "short"}`}>
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
						<div key={cl.key} className={`cost-line ${cl.ok ? "ok" : "short"}`}>
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
			className={`plot-card text-left${focused ? " focused" : ""}`}
			onMouseEnter={() => onFocus(id)}
			onClick={() => onFocus(id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (canBuy) onBuy(id);
			}}
		>
			<div className="plot-head">
				<div
					className="dot"
					style={{ background: canBuy ? "var(--c-ember)" : "var(--ink-dim)" }}
				/>
				<div className="plot-name">{GARDEN_PLOT_NAMES[idx]}</div>
			</div>
			<div className="plot-stats">
				<div className="ps-k">YIELD</div>
				<div className="ps-v">{yieldNow}/s</div>
				<div className="ps-k">LEVEL</div>
				<div className="ps-v">LV {level}</div>
			</div>
			<div className="plot-cost">
				{level === 0 && (
					<div
						className="mono"
						style={{
							fontSize: 9,
							color: "var(--ink-dim)",
							letterSpacing: "0.12em",
							marginBottom: 4,
						}}
					>
						PURCHASE
					</div>
				)}
				{costEntry.map((cl) => (
					<div key={cl.key} className={`cost-row-sm ${cl.ok ? "ok" : "short"}`}>
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
			<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
				<div>
					<div className="eyebrow-sm">Bone Garden Plot</div>
					<div
						className="display"
						style={{
							fontSize: 24,
							color: "var(--ink-bone)",
							letterSpacing: "0.06em",
							marginTop: 8,
						}}
					>
						{GARDEN_PLOT_NAMES[gardenIdx]}
					</div>
					<div
						className="mono"
						style={{
							fontSize: 10,
							color: "var(--c-ember)",
							letterSpacing: "0.20em",
							marginTop: 8,
						}}
					>
						LV {level}
					</div>
				</div>
				<div>
					<div className="eyebrow-sm" style={{ marginBottom: 8 }}>
						Yield
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: 14,
							padding: "10px 0",
						}}
					>
						<span
							className="display"
							style={{ fontSize: 22, color: "var(--ink-bone)" }}
						>
							{yieldNow}/s
						</span>
						<span
							className="mono"
							style={{ fontSize: 16, color: "var(--ink-dim)" }}
						>
							→
						</span>
						<span
							className="display"
							style={{ fontSize: 22, color: "var(--c-ember)" }}
						>
							{yieldNext}/s
						</span>
					</div>
				</div>
				<CostBlock cost={cost} res={res} />
				<button
					type="button"
					className="cta-purchase"
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
			<div
				className="mono"
				style={{
					fontSize: 10,
					color: "var(--ink-dim)",
					letterSpacing: "0.14em",
					textAlign: "center",
					marginTop: 40,
				}}
			>
				HOVER A ROW TO SEE DETAILS
			</div>
		);

	if (row.locked)
		return (
			<div>
				<div className="eyebrow-sm" style={{ marginBottom: 6 }}>
					Locked
				</div>
				<div
					className="display"
					style={{
						fontSize: 22,
						color: "var(--ink-parchm)",
						letterSpacing: "0.10em",
					}}
				>
					{row.name}
				</div>
				<div
					style={{
						marginTop: 14,
						padding: 16,
						border: "1px solid var(--rule)",
						background: "var(--bg-inset)",
						color: "var(--ink-muted)",
						fontFamily: "var(--f-body)",
						fontStyle: "italic",
						fontSize: 14,
						lineHeight: 1.5,
					}}
				>
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
		<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
			<div>
				<div className="eyebrow-sm">
					{isSkill ? "One-time Upgrade" : "Leveled Upgrade"}
				</div>
				<div
					className="display"
					style={{
						fontSize: 26,
						color: "var(--ink-bone)",
						letterSpacing: "0.06em",
						marginTop: 8,
						lineHeight: 1.2,
					}}
				>
					{row.name}
				</div>
				<div
					className="mono"
					style={{
						fontSize: 10,
						color: maxed ? "var(--hp-good)" : "var(--c-ember)",
						letterSpacing: "0.20em",
						marginTop: 8,
					}}
				>
					{maxed ? "INSCRIBED" : `LV ${row.level}`}
				</div>
			</div>
			<div
				style={{
					padding: 16,
					border: "1px solid var(--rule)",
					background: "var(--bg-inset)",
					fontFamily: "var(--f-body)",
					fontSize: 14,
					color: "var(--ink-parchm)",
					lineHeight: 1.6,
				}}
			>
				{row.description}
			</div>
			{row.flavor && (
				<div
					style={{
						fontFamily: "var(--f-body)",
						fontStyle: "italic",
						fontSize: 13,
						color: "var(--ink-muted)",
						lineHeight: 1.5,
					}}
				>
					"{row.flavor}"
				</div>
			)}
			{!maxed && (
				<div>
					<div className="eyebrow-sm" style={{ marginBottom: 8 }}>
						Current → Next
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "baseline",
							gap: 14,
							padding: "10px 0",
						}}
					>
						<span
							className="display"
							style={{ fontSize: 22, color: "var(--ink-bone)" }}
						>
							{valueNumerical ? valueNumerical : row.valueFn(row.level)}
						</span>
						<span
							className="mono"
							style={{ fontSize: 16, color: "var(--ink-dim)" }}
						>
							→
						</span>
						<span
							className="display"
							style={{ fontSize: 22, color: "var(--c-ember)" }}
						>
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
					className="cta-purchase"
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
				<div
					style={{
						padding: 14,
						border: "1px solid var(--hp-good)",
						background: "rgba(111,169,98,0.06)",
						textAlign: "center",
					}}
				>
					<div
						className="mono"
						style={{
							fontSize: 10,
							color: "var(--hp-good)",
							letterSpacing: "0.16em",
						}}
					>
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
			<div className="eyebrow-sm" style={{ marginBottom: 8 }}>
				Cost
			</div>
			<div
				style={{
					border: "1px solid var(--rule)",
					background: "var(--bg-inset)",
					padding: "0 14px",
				}}
			>
				{lines.map((cl) => (
					<div key={cl.key} className={`cb-row ${cl.ok ? "ok" : "short"}`}>
						<Icon
							kind={cl.icon}
							size={18}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<div className="cb-name">{cl.label}</div>
						<div className="cb-stock">
							{formatNumber(
								Math.floor(res[cl.key as keyof Resources] as number),
							)}
						</div>
						<div className="cb-req">/ {formatNumber(cl.amount)}</div>
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
			<div className="eyebrow-sm" style={{ marginBottom: 8 }}>
				Cost
			</div>
			<div
				style={{
					border: "1px solid var(--rule)",
					background: "var(--bg-inset)",
					padding: "0 14px",
				}}
			>
				<div className={`cb-row ${ok ? "ok" : "short"}`}>
					<Icon
						kind="triple"
						size={18}
						color={ok ? "var(--c-coin)" : "var(--hp-crit)"}
					/>
					<div className="cb-name">Skill Points</div>
					<div className="cb-req">{skillCost}</div>
					<div className="cb-stock">/ {pts}</div>
					<div className="cb-mark">{ok ? "✓" : "✗"}</div>
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
		<div style={{ display: "flex", flex: 1, minHeight: 0 }}>
			<SideNav
				sections={sections}
				activeId={activeId}
				onSelect={(id) => {
					setActiveId(id);
					setFocusedId(null);
				}}
				anyDot={anyDot}
			/>

			<div className="wkshp-center">
				<div className="wkshp-section-head">
					<div
						className="mono"
						style={{
							fontSize: 11,
							color: "var(--ink-dim)",
							letterSpacing: "0.32em",
						}}
					>
						SECTION · {sections.indexOf(active) + 1} OF {sections.length}
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "flex-end",
							gap: 22,
							marginTop: 10,
						}}
					>
						<Icon
							kind={active.icon}
							size={44}
							color={active.unlocked ? "var(--ink-bone)" : "var(--ink-dim)"}
						/>
						<div>
							<div
								className="display"
								style={{
									fontSize: 36,
									color: "var(--ink-bone)",
									letterSpacing: "0.16em",
									textTransform: "uppercase",
									lineHeight: 1,
								}}
							>
								{active.name}
							</div>
							<div
								style={{
									fontFamily: "var(--f-body)",
									fontStyle: "italic",
									fontSize: 14,
									color: "var(--ink-parchm)",
									marginTop: 6,
								}}
							>
								{active.subtitle}
							</div>
						</div>
					</div>
				</div>

				{!active.unlocked && (
					<div className="lock-banner">
						<div className="ico">
							<Icon kind="forbid" size={26} color="var(--ink-dim)" />
						</div>
						<div className="body">
							<h3>{active.lockedTitle}</h3>
							<p>{active.lockedBody}</p>
						</div>
					</div>
				)}

				{active.unlocked && active.type === "garden" && (
					<>
						<div className="aff-strip">
							<div className="aff-label">Garden Yield</div>
							<div
								className="mono"
								style={{ fontSize: 13, color: "var(--c-bone)" }}
							>
								{gardenTotalYield}{" "}
								<span style={{ fontSize: 10, color: "var(--ink-dim)" }}>
									BONES/SEC
								</span>
							</div>
						</div>
						<div className="plots-grid">
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

			<div className="wkshp-right">
				<Detail
					rowId={focusedId}
					sections={sections}
					res={res}
					pts={pts}
					onBuy={levelUpWorkshop}
					onSkillBuy={purchaseUpgrade}
					gameState={gameState}
				/>
				<div
					style={{
						marginTop: "auto",
						padding: 14,
						border: "1px solid var(--rule)",
						background: "var(--bg-inset)",
					}}
				>
					<div
						className="mono"
						style={{
							fontSize: 10,
							color: "var(--ink-dim)",
							letterSpacing: "0.14em",
							lineHeight: 1.7,
						}}
					>
						HOVER A ROW TO SEE DETAILS.
						<br />
						RIGHT-CLICK TO UPGRADE INSTANTLY.
					</div>
				</div>
			</div>
		</div>
	);
}
