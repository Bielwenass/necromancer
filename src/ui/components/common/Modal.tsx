import type React from "react";
import { useEffect } from "react";

interface ModalProps {
	label: string;
	/**
	 * Dismiss handler. Omitting it makes the modal undismissable by backdrop or
	 * Escape, which the offline-catchup overlay needs while it works.
	 */
	onClose?: () => void;
	backdropClassName?: string;
	zClassName?: string;
	/** Extra classes on the backdrop; pass `flex-col` for stacked content. */
	className?: string;
	children: React.ReactNode;
}

/**
 * The shared overlay shell: a tinted full-screen backdrop with dialog
 * semantics, backdrop-click dismissal, and Escape wired to the same handler.
 * Escape is bound on `window`, so it fires wherever focus happens to be.
 */
export function Modal({
	label,
	onClose,
	backdropClassName = "bg-[rgba(0,0,0,0.7)]",
	zClassName = "z-[100]",
	className,
	children,
}: ModalProps) {
	useEffect(() => {
		if (!onClose) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={label}
			tabIndex={-1}
			className={`fixed inset-0 flex items-center justify-center ${backdropClassName} ${zClassName}${
				className ? ` ${className}` : ""
			}`}
			onClick={(e) => {
				if (onClose && e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (onClose && e.key === "Escape") onClose();
			}}
		>
			{children}
		</div>
	);
}
