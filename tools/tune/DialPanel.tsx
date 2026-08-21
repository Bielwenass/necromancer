import { useState } from "react";
import type { ConfigDial } from "../dials";
import { NumberField } from "./NumberField";

interface DialPanelProps {
	dials: ConfigDial[];
	values: Record<string, number>;
	onSet: (path: string, value: number) => void;
}

/** A dial's own magnitude sets its step, so a 0.05 weight isn't nudged by 1. */
function stepFor(value: number): number {
	const mag = Math.abs(value);
	if (mag === 0) return 0.1;
	if (mag < 0.01) return 0.0001;
	if (mag < 1) return 0.01;
	if (mag < 20) return 0.5;
	return 5;
}

export function DialPanel({ dials, values, onSet }: DialPanelProps) {
	const [open, setOpen] = useState<string | null>("simulation");

	const groups = new Map<string, ConfigDial[]>();
	for (const dial of dials) {
		const group = dial.path.split(".")[0];
		const list = groups.get(group);
		if (list) list.push(dial);
		else groups.set(group, [dial]);
	}

	return (
		<div className="flex flex-col">
			{[...groups].map(([group, list]) => {
				const dirty = list.filter((d) => values[d.path] !== d.value).length;
				return (
					<div key={group} className="border-b border-[color:var(--rule)]">
						<button
							type="button"
							onClick={() => setOpen(open === group ? null : group)}
							className="flex w-full items-center justify-between px-3 py-2 font-display text-[11px] uppercase tracking-[0.2em] text-parchm hover:bg-bg-hover"
						>
							<span>{group}</span>
							<span className="font-mono text-[10px] text-dim">
								{dirty > 0 && <span className="text-ember">{dirty} · </span>}
								{open === group ? "−" : "+"}
							</span>
						</button>
						{open === group && (
							<div className="px-3 pb-2">
								{list.map((dial) => (
									<NumberField
										key={dial.path}
										label={dial.path.slice(group.length + 1)}
										value={values[dial.path]}
										step={stepFor(dial.value)}
										changed={values[dial.path] !== dial.value}
										onReset={() => onSet(dial.path, dial.value)}
										onChange={(v) => onSet(dial.path, v)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
