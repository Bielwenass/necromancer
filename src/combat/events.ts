import type { CombatEvent } from './types';

export class EventQueue {
  private events: CombatEvent[] = [];
  private flashCursor = 0;

  emit(event: CombatEvent): void { this.events.push(event); }

  drain(): CombatEvent[] {
    const out = this.events;
    this.events = [];
    this.flashCursor = 0;
    return out;
  }

  // Returns events added since the last drainFlash() without removing them from the main queue.
  // The main queue is still available for the consumer via drain().
  drainFlash(): CombatEvent[] {
    const out = this.events.slice(this.flashCursor);
    this.flashCursor = this.events.length;
    return out;
  }

  peek(): readonly CombatEvent[] { return this.events; }
}
