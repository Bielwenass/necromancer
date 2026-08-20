import type React from "react";
import { Button, type ButtonSize } from "./Button";

interface ConfirmActionProps {
	confirming: boolean;
	onRequest: () => void;
	onConfirm: () => void;
	onCancel: () => void;
	label: React.ReactNode;
	confirmLabel?: React.ReactNode;
	cancelLabel?: React.ReactNode;
	message?: React.ReactNode;
	size?: ButtonSize;
	/** Layout only, shared by all three buttons; tone comes from the state. */
	className?: string;
}

/**
 * A destructive action behind a two-press confirm. Owns the state machine and
 * the tone of each state; the caller sizes and places the buttons.
 */
export function ConfirmAction({
	confirming,
	onRequest,
	onConfirm,
	onCancel,
	label,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	message,
	size,
	className,
}: ConfirmActionProps) {
	if (!confirming) {
		return (
			<Button size={size} className={className} onClick={onRequest}>
				{label}
			</Button>
		);
	}

	return (
		<>
			{message}
			<Button size={size} tone="muted" className={className} onClick={onCancel}>
				{cancelLabel}
			</Button>
			<Button
				size={size}
				tone="danger"
				variant="solid"
				className={className}
				onClick={onConfirm}
			>
				{confirmLabel}
			</Button>
		</>
	);
}
