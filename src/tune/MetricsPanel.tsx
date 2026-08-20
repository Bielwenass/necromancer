export interface Metrics {
	ticks: number;
	perTickMs: number;
	/** Over the last sampling window rather than the whole fight. */
	recentPerTickMs: number;
	fps: number;
	gridPct: number;
	accelPct: number;
	/** Overlapping enemy pairs per unit-tick, the hard-contact workload. */
	contactPairs: number;
	damagePct: number;
	neighborPct: number;
	seekPct: number;
	integratePct: number;
	avgNeighbors: number;
	maxNeighbors: number;
	aliveA: number;
	aliveB: number;
	collisionRadius: number;
	winner: string;
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-3 font-mono text-[11px]">
			<span className="text-muted">{label}</span>
			<span className="text-bone">{value}</span>
		</div>
	);
}

export function MetricsPanel({
	metrics,
	detail,
}: {
	metrics: Metrics;
	detail: boolean;
}) {
	const m = metrics;
	return (
		<div className="flex flex-col gap-1">
			<Row label="ms / tick" value={m.perTickMs.toFixed(3)} />
			<Row label="ms / tick (recent)" value={m.recentPerTickMs.toFixed(3)} />
			<Row label="draw fps" value={m.fps.toFixed(0)} />
			<Row label="ticks" value={String(m.ticks)} />
			<Row label="alive a / b" value={`${m.aliveA} / ${m.aliveB}`} />
			<Row label="winner" value={m.winner} />
			<Row label="collision radius" value={m.collisionRadius.toFixed(2)} />

			<div className="mt-2 border-t border-[color:var(--rule)] pt-2">
				<Row label="grid" value={`${m.gridPct.toFixed(0)}%`} />
				<Row label="accel" value={`${m.accelPct.toFixed(0)}%`} />
				<Row label="contacts/unit" value={m.contactPairs.toFixed(2)} />
				<Row label="damage" value={`${m.damagePct.toFixed(0)}%`} />
			</div>

			<div className="mt-2 border-t border-[color:var(--rule)] pt-2">
				{detail ? (
					<>
						<Row label="· neighbors" value={`${m.neighborPct.toFixed(0)}%`} />
						<Row label="· seek" value={`${m.seekPct.toFixed(0)}%`} />
						<Row label="· integrate" value={`${m.integratePct.toFixed(0)}%`} />
					</>
				) : (
					<div className="font-mono text-[10px] text-dim">
						accel split needs detail timing
					</div>
				)}
				<Row label="neighbors / unit" value={m.avgNeighbors.toFixed(1)} />
				<Row label="max neighbors" value={m.maxNeighbors.toFixed(0)} />
			</div>
		</div>
	);
}
