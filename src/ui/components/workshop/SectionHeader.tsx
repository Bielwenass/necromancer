import type { WorkshopSection } from "./types";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function SectionHeader({ section }: { section: WorkshopSection }) {
	return (
		<div className="px-8 pt-6 pb-5 border-b border-[color:var(--rule)] shrink-0">
			<div className="flex items-end gap-[22px] mt-2.5">
				<WorkshopRowIcon
					kind={section.icon}
					size={44}
					color={section.unlocked ? "var(--ink-bone)" : "var(--ink-dim)"}
				/>
				<div>
					<div className="font-display text-4xl text-bone tracking-[0.16em] uppercase leading-none">
						{section.name}
					</div>
					<div className="font-body italic text-sm text-parchm mt-1.5">
						{section.subtitle}
					</div>
				</div>
			</div>
		</div>
	);
}
