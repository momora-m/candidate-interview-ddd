import { IDomainEvent } from '@/domain/shared/DomainEvent';

export type DomainEventHandler<T extends IDomainEvent = IDomainEvent> = (
  event: T
) => void | Promise<void>;

export interface IEventBus {
  publish(event: IDomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<IDomainEvent>): Promise<void>;
  subscribe<T extends IDomainEvent>(eventType: string, handler: DomainEventHandler<T>): () => void;
  getHistory(): IDomainEvent[];
  clearHistory(): void;
}
