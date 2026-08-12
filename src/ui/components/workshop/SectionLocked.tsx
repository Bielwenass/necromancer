import type { WorkshopSection } from "./types";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function SectionLocked({ section }: { section: WorkshopSection }) {
	return (
		<div className="flex items-start gap-[18px] p-6 my-4 mx-8 border border-[color:var(--rule)] bg-bg-inset">
			<div className="pt-0.5">
				<WorkshopRowIcon kind="forbid" size={26} color="var(--ink-dim)" />
			</div>
			<div>
				<h3 className="text-sm text-muted tracking-[0.12em] mb-2">
					{section.lockedTitle}
				</h3>
				<p className="text-[13px] text-dim font-body italic leading-relaxed">
					{section.lockedBody}
				</p>
			</div>
		</div>
	);
}
