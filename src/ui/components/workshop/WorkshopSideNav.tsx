import type { WorkshopSection } from "./types";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function WorkshopSideNav({
	sections,
	activeId,
	onSelect,
	anyDot,
}: {
	sections: WorkshopSection[];
	activeId: string;
	onSelect: (id: string) => void;
	anyDot: Record<string, boolean>;
}) {
	return (
		<div className="w-[280px] min-w-[280px] border-r border-[color:var(--rule)] bg-bg-panel flex flex-col overflow-y-auto">
			<div className="pt-4 px-5 pb-3 border-b border-[color:var(--rule)]">
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					Crypt Workshop
				</div>
			</div>
			{sections.map((s) => (
				<button
					type="button"
					key={s.id}
					className={
						"flex items-center gap-3.5 pt-3.5 pb-3.5 pr-5 border-b border-[color:var(--rule)] text-left w-full transition-colors duration-[120ms] " +
						(s.id === activeId
							? "bg-[rgba(214,122,48,0.07)] border-l-2 border-l-ember pl-5"
							: "pl-[22px] hover:bg-bg-hover ") +
						(!s.unlocked ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
					}
					onClick={() => s.unlocked && onSelect(s.id)}
				>
					<div className="flex items-center">
						<WorkshopRowIcon
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
					<div className="font-display text-xs tracking-[0.2em] uppercase flex-1 text-parchm">
						{s.name}
					</div>
					{anyDot[s.id] && (
						<div className="w-[7px] h-[7px] rounded-full bg-ember shadow-[0_0_5px_var(--c-ember)]" />
					)}
				</button>
			))}
		</div>
	);
}
