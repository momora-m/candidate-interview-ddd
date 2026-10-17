import { IDomainEvent } from '@/domain/shared/DomainEvent';
import { IEventBus, DomainEventHandler } from '@/application/events/IEventBus';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Set<DomainEventHandler>> = new Map();
  private wildcardHandlers: Set<DomainEventHandler> = new Set();
  private eventHistory: IDomainEvent[] = [];
  private static readonly MAX_HISTORY = 100;

  public async publish(event: IDomainEvent): Promise<void> {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > InMemoryEventBus.MAX_HISTORY) {
      this.eventHistory.pop();
    }

    const specificHandlers = this.handlers.get(event.eventType) || new Set();
    const allHandlers = [...Array.from(specificHandlers), ...Array.from(this.wildcardHandlers)];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Error in domain event handler for ${event.eventType}:`, err);
      }
    }
  }

  public async publishAll(events: ReadonlyArray<IDomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  public subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): () => void {
    if (eventType === '*') {
      this.wildcardHandlers.add(handler as DomainEventHandler);
      return () => {
        this.wildcardHandlers.delete(handler as DomainEventHandler);
      };
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const set = this.handlers.get(eventType)!;
    set.add(handler as DomainEventHandler);

    return () => {
      set.delete(handler as DomainEventHandler);
    };
  }

  public getHistory(): IDomainEvent[] {
    return [...this.eventHistory];
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}
