import { useRef, useState } from "react";
import { exportSave } from "../../../game/save";
import { useGameStore } from "../../../game/store";
import { formatRate } from "../../format";
import { DANGER_BUTTON } from "../common/ConfirmAction";
import { Modal } from "../common/Modal";
import { SectionLabel } from "../common/SectionLabel";
import { IconBanner, IconBone, IconCorpse, IconDust, IconSoul } from "../icons";
import { ResourceReadout } from "./ResourceReadout";

const btnBase =
	"block w-full py-2.5 px-4 border border-[color:var(--rule-strong)] text-parchm font-display text-[11px] tracking-[0.18em] bg-transparent cursor-pointer text-left uppercase transition-colors duration-150 hover:bg-bg-hover";

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

	// Souls and dust stay hidden until the player has any, so the bar doesn't
	// advertise systems that aren't unlocked yet.
	const readouts = [
		{
			label: "Bones",
			value: resources.bones,
			Icon: IconBone,
			note: derived.bonesPerTick > 0 ? formatRate(derived.bonesPerTick) : null,
		},
		{ label: "Corpses", value: resources.corpses, Icon: IconCorpse },
		...(resources.souls > 0
			? [{ label: "Souls", value: resources.souls, Icon: IconSoul }]
			: []),
		...(resources.dust > 0
			? [{ label: "Dust", value: resources.dust, Icon: IconDust }]
			: []),
		{ label: "Banners", value: resources.banners, Icon: IconBanner },
	];

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

				{/* Settings button — replaces the phase label */}
				<button
					type="button"
					onClick={openSettings}
					title="Settings"
					className="flex items-center gap-[7px] py-1 px-3 border border-[color:var(--rule)] rounded-sm font-mono text-[10px] tracking-[0.14em] text-muted bg-transparent cursor-pointer transition-colors duration-150 hover:text-parchm hover:border-[color:var(--rule-strong)]"
				>
					{/* Gear icon */}
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
					SETTINGS
				</button>

				<div className="flex gap-[18px] pl-[22px] ml-2 border-l border-[color:var(--rule)] items-center font-mono text-[11px] text-muted">
					<span>{dayStr}</span>
					<span className="text-dim">T:{meta.tickCount}</span>
				</div>

				<div className="ml-auto flex gap-[22px] items-center">
					{resources.bones < 10_000 && (
						<button
							type="button"
							onClick={digBone}
							title="Dig a bone"
							className="py-[3px] px-[9px] border border-[color:var(--rule-strong)] text-bone font-mono text-[9px] tracking-[0.16em] bg-transparent cursor-pointer flex items-center gap-[5px] self-center"
						>
							DIG
							<IconBone size={14} />
						</button>
					)}
					{readouts.map(({ label, value, Icon, note }) => (
						<ResourceReadout
							key={label}
							label={label}
							value={value}
							Icon={Icon}
							note={note}
						/>
					))}
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
					<div className="bg-bg-panel border border-rule-strong px-9 py-8 min-w-[340px] max-w-[400px]">
						{/* Header */}
						<div className="flex items-center justify-between mb-7">
							<SectionLabel className="text-sm text-parchm tracking-[0.28em]">
								SETTINGS
							</SectionLabel>
							<button
								type="button"
								onClick={closeSettings}
								className="text-dim text-base leading-none py-0.5 px-1.5 cursor-pointer"
							>
								✕
							</button>
						</div>

						{/* Save data section */}
						<div className="font-mono text-[9px] tracking-[0.18em] text-dim uppercase mb-2.5">
							Save Data
						</div>

						<div className="flex flex-col gap-2 mb-5">
							<button type="button" onClick={exportSave} className={btnBase}>
								Export Save (JSON)
							</button>

							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className={btnBase}
							>
								Import Save (JSON)
							</button>

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
							<button
								type="button"
								onClick={() => setResetConfirm(true)}
								className="block w-full py-2.5 px-4 border border-[color:rgba(196,90,62,0.35)] text-hp-crit font-display text-[11px] tracking-[0.18em] bg-transparent cursor-pointer text-left uppercase transition-colors duration-150 hover:bg-[rgba(196,90,62,0.07)]"
							>
								Reset Save
							</button>
						) : (
							<div>
								<div className="font-mono text-[11px] text-muted mb-3.5 leading-relaxed">
									All progress will be lost.
									<br />
									The dead cannot be raised again.
								</div>
								<div className="flex gap-2.5">
									<button
										type="button"
										onClick={() => setResetConfirm(false)}
										className={`${btnBase} flex-1 text-center`}
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleReset}
										className={`flex-1 py-2.5 px-4 border ${DANGER_BUTTON} font-display text-[11px] tracking-[0.18em] cursor-pointer text-center uppercase transition-colors duration-150 hover:bg-[rgba(196,90,62,0.16)]`}
									>
										Reset
									</button>
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
