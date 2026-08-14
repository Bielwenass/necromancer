import type React from "react";

/**
 * The crit-red treatment every destructive confirm shares. Call sites that can't
 * use `ConfirmAction`, such as the settings reset, still import this.
 */
export const DANGER_BUTTON =
	"border-hp-crit text-hp-crit bg-[rgba(196,90,62,0.08)]";

interface ConfirmActionProps {
	confirming: boolean;
	onRequest: () => void;
	onConfirm: () => void;
	onCancel: () => void;
	label: React.ReactNode;
	confirmLabel?: React.ReactNode;
	cancelLabel?: React.ReactNode;
	message?: React.ReactNode;
	/**
	 * Sizing and typography shared by all three buttons. Must carry no colour or
	 * border-colour utility, or it will fight the ones added per state.
	 */
	buttonClassName: string;
}

/**
 * A destructive action behind a two-press confirm. Owns the state machine and
 * the colour of each state; the caller sizes the buttons.
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
	buttonClassName,
}: ConfirmActionProps) {
	if (!confirming) {
		return (
			<button
				type="button"
				onClick={onRequest}
				className={`${buttonClassName} border border-rule-strong text-parchm`}
			>
				{label}
			</button>
		);
	}

	return (
		<>
			{message}
			<button
				type="button"
				onClick={onCancel}
				className={`${buttonClassName} border border-rule-strong text-muted`}
			>
				{cancelLabel}
			</button>
			<button
				type="button"
				onClick={onConfirm}
				className={`${buttonClassName} border ${DANGER_BUTTON}`}
			>
				{confirmLabel}
			</button>
		</>
	);
}
