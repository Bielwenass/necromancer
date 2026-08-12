import { useEffect, useRef } from "react";
import type { WorkshopRow } from "./types";

interface RowNav {
	rows: WorkshopRow[];
	pinnedId: string | null;
	onPin: (id: string) => void;
	onBuyPinned: () => void;
}

/**
 * Keyboard companion to click-to-pin: ↑/↓ move the pin within the active
 * section, Enter buys the pinned row. Hovering deliberately does nothing —
 * the detail panel only changes when the player asks it to.
 *
 * The handler reads its inputs through a ref so the listener is attached once,
 * not re-bound on every tick-driven re-render of the screen.
 */
export function useRowNav(nav: RowNav) {
	const latest = useRef(nav);
	useEffect(() => {
		latest.current = nav;
	});

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// App.tsx handles the catchup overlay's Enter first and marks it handled.
			if (e.defaultPrevented) return;
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
			if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") {
				return;
			}
			e.preventDefault();

			const { rows, pinnedId, onPin, onBuyPinned } = latest.current;
			if (e.key === "Enter") {
				onBuyPinned();
				return;
			}
			const i = rows.findIndex((r) => r.id === pinnedId);
			const next =
				e.key === "ArrowDown"
					? Math.min(rows.length - 1, i + 1)
					: Math.max(0, i - 1);
			const row = rows[next];
			if (!row || row.id === pinnedId) return;
			onPin(row.id);
			document
				.getElementById(`wrow-${row.id}`)
				?.scrollIntoView({ block: "nearest" });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}
