import { Entity } from './Entity';
import { IDomainEvent } from './DomainEvent';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: IDomainEvent[] = [];

  protected constructor(id: TId) {
    super(id);
  }

  public get domainEvents(): ReadonlyArray<IDomainEvent> {
    return [...this._domainEvents];
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
