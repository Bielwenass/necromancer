import type React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * Wraps trigger content with a tap-to-toggle popover carrying the same text as
 * `title`, so information that would otherwise only surface on hover stays
 * reachable on touch. A `<span>`, not a `<button>`, since triggers are often
 * nested inside another clickable element (e.g. a dungeon card).
 */
export function InfoTooltip({
	tip,
	className,
	children,
}: {
	tip: string;
	className?: string;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!open) return;
		const onDocClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("click", onDocClick);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("click", onDocClick);
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		// biome-ignore lint/a11y/useSemanticElements: a real nested <button> would be invalid HTML — triggers are often nested inside another element's own <button>.
		<span
			ref={ref}
			role="button"
			tabIndex={0}
			title={tip}
			onClick={(e) => {
				e.stopPropagation();
				setOpen((o) => !o);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					e.stopPropagation();
					setOpen((o) => !o);
				}
			}}
			className={`relative inline-flex items-center cursor-pointer${className ? ` ${className}` : ""}`}
		>
			{children}
			{open && (
				<span
					role="tooltip"
					className="absolute z-50 top-full left-0 mt-1.5 w-max max-w-[240px] normal-case bg-bg-panel border border-rule-strong px-2.5 py-1.5 text-left font-mono text-[10px] leading-relaxed tracking-normal text-parchm shadow-lg"
				>
					{tip}
				</span>
			)}
		</span>
	);
}
