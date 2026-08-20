import { useRef, useState } from "react";
import { exportSave } from "../../../game/save";
import { useGameStore } from "../../../game/store";
import type { DerivedFlagKey, Resources } from "../../../game/types";
import { formatRate } from "../../format";
import { RESOURCE_KEYS, RESOURCE_META } from "../../resources";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { SectionLabel } from "../common/SectionLabel";
import { IconBone } from "../icons";
import { ResourceReadout } from "./ResourceReadout";

const ALWAYS_SHOWN = new Set<keyof Resources>(["bones", "banners"]);

/** A gated economy also appears once its gate opens, before the first drop. */
const ECONOMY_FLAG: Partial<Record<keyof Resources, DerivedFlagKey>> = {
	corpses: "corpsesUnlocked",
	souls: "soulsUnlocked",
};

export function TopBar() {
	const resources = useGameStore((s) => s.resources);
	const derived = useGameStore((s) => s.derived);
	const meta = useGameStore((s) => s.meta);
	const digBone = useGameStore((s) => s.digBone);
	const importSave = useGameStore((s) => s.importSave);
	const resetSave = useGameStore((s) => s.resetSave);

	const [showSettings, setShowSettings] = useState(false);
	const [resetConfirm, setResetConfirm] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [importSuccess, setImportSuccess] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const dayStr = `DAY ${meta.dayCount}`;

	// An unopened economy stays off the bar until the player holds some of it.
	const readouts = RESOURCE_KEYS.filter((key) => {
		const flag = ECONOMY_FLAG[key];
		return (
			ALWAYS_SHOWN.has(key) ||
			resources[key] > 0 ||
			(flag ? derived[flag] : false)
		);
	});

	const closeSettings = () => {
		setShowSettings(false);
		setResetConfirm(false);
	};

	const openSettings = () => {
		setShowSettings(true);
		setResetConfirm(false);
		setImportError(null);
		setImportSuccess(false);
	};

	const handleReset = () => {
		resetSave();
		window.location.reload();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			const result = importSave(text);
			if (result.ok) {
				setImportSuccess(true);
				setImportError(null);
				setTimeout(() => window.location.reload(), 900);
			} else {
				setImportError(result.error);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	return (
		<>
			<div className="bar-top">
				<div className="flex items-baseline gap-2.5 font-display tracking-[0.32em] text-sm text-parchm">
					<span>NECROMANCER</span>
				</div>

				<Button size="sm" tone="muted" onClick={openSettings} title="Settings">
					<svg
						width={12}
						height={12}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
					Settings
				</Button>

				<div className="max-md:hidden flex gap-[18px] pl-[22px] ml-2 border-l border-[color:var(--rule)] items-center font-mono text-[11px] text-muted">
					<span>{dayStr}</span>
					<span className="text-dim">T:{meta.tickCount}</span>
				</div>

				<div className="ml-auto flex gap-5 items-center max-md:ml-0 max-md:order-3 max-md:w-full max-md:gap-2 max-md:overflow-x-auto">
					{resources.bones < 10_000 && (
						<Button
							size="xs"
							tone="bone"
							onClick={digBone}
							title="Dig a bone"
							className="self-center max-md:shrink-0"
						>
							Dig
							<IconBone size={14} />
						</Button>
					)}
					{readouts.map((key) => {
						const { label, icon } = RESOURCE_META[key];
						return (
							<ResourceReadout
								key={key}
								label={label}
								value={resources[key]}
								Icon={icon}
								note={
									key === "bones" && derived.bonesPerTick > 0
										? formatRate(derived.bonesPerTick)
										: null
								}
							/>
						);
					})}
				</div>
			</div>

			{/* ── Settings modal ─────────────────────────────────────────── */}
			{showSettings && (
				<Modal
					label="Settings"
					onClose={closeSettings}
					backdropClassName="bg-[rgba(0,0,0,0.72)]"
					zClassName="z-[200]"
				>
					<div className="bg-bg-panel border border-rule-strong px-9 py-8 min-w-[340px] max-w-[400px] max-md:min-w-0 max-md:w-[calc(100vw-32px)] max-md:px-6 max-md:py-6">
						{/* Header */}
						<div className="flex items-center justify-between mb-7">
							<SectionLabel className="text-sm text-parchm tracking-[0.28em]">
								SETTINGS
							</SectionLabel>
							<Button
								size="icon"
								variant="quiet"
								tone="muted"
								onClick={closeSettings}
								title="Close"
							>
								✕
							</Button>
						</div>

						{/* Save data section */}
						<div className="font-mono text-[9px] tracking-[0.18em] text-dim uppercase mb-2.5">
							Save Data
						</div>

						<div className="flex flex-col gap-2 mb-5">
							<Button full onClick={exportSave}>
								Export save (JSON)
							</Button>

							<Button full onClick={() => fileInputRef.current?.click()}>
								Import save (JSON)
							</Button>

							{importError && (
								<div className="font-mono text-[10px] text-hp-crit pt-1.5 pb-0.5">
									{importError}
								</div>
							)}
							{importSuccess && (
								<div className="font-mono text-[10px] text-hp-good pt-1.5 pb-0.5">
									Imported — reloading…
								</div>
							)}
						</div>

						{/* Divider */}
						<div className="h-px bg-[color:var(--rule)] mt-1 mb-5" />

						{/* Reset section */}
						{!resetConfirm ? (
							<Button tone="danger" full onClick={() => setResetConfirm(true)}>
								Reset save
							</Button>
						) : (
							<div>
								<div className="font-mono text-[11px] text-muted mb-3.5 leading-relaxed">
									All progress will be lost.
								</div>
								<div className="flex gap-2.5">
									<Button
										tone="muted"
										className="flex-1"
										onClick={() => setResetConfirm(false)}
									>
										Cancel
									</Button>
									<Button
										tone="danger"
										variant="solid"
										className="flex-1"
										onClick={handleReset}
									>
										Reset
									</Button>
								</div>
							</div>
						)}

						{/* Hidden file input for import */}
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,application/json"
							className="hidden"
							onChange={handleFileChange}
						/>
					</div>
				</Modal>
			)}
		</>
	);
}
