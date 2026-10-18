import type { IDomainEvent } from '@/domain/shared/DomainEvent';

/**
 * Outbox rows that have been committed but not yet handed to the in-process bus.
 * Marking happens only after publish, so a crash between commit and publish can be replayed.
 */
export interface DomainEventDispatchLog {
  loadPending(): Promise<IDomainEvent[]>;
  markDispatched(eventIds: readonly string[]): Promise<void>;
}
