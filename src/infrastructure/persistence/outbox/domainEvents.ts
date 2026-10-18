import type { DomainEventDispatchLog } from '@/application/events/DomainEventDispatchLog';
import type { IDomainEvent } from '@/domain/shared/DomainEvent';
import type { SqlClient, SqlQuery } from '../SqlClient';

export type AggregateType = 'TargetCompany' | 'JobApplication';

interface DomainEventRow extends Record<string, unknown> {
  event_id: string;
  aggregate_id: string;
  event_type: string;
  occurred_on: Date | string;
  payload: unknown;
}

export async function appendDomainEvents(
  tx: SqlQuery,
  aggregateType: AggregateType,
  events: readonly IDomainEvent[]
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const tuples = events.map((event) => {
    const start = values.length;
    values.push(
      event.eventId,
      event.aggregateId,
      aggregateType,
      event.eventType,
      event.occurredOn,
      JSON.stringify(event.payload ?? {})
    );
    const placeholder = (offset: number) => `$${start + offset}`;
    return `(${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, ${placeholder(4)}, ${placeholder(5)}, ${placeholder(6)}::jsonb)`;
  });

  await tx.query(
    `INSERT INTO domain_events (
       event_id, aggregate_id, aggregate_type, event_type, occurred_on, payload
     ) VALUES ${tuples.join(', ')}
     ON CONFLICT (event_id) DO NOTHING`,
    values
  );
}

export class PostgresDomainEventDispatchLog implements DomainEventDispatchLog {
  public constructor(private readonly db: SqlClient) {}

  public async loadPending(): Promise<IDomainEvent[]> {
    const result = await this.db.query<DomainEventRow>(
      `SELECT event_id, aggregate_id, event_type, occurred_on, payload
         FROM domain_events
        WHERE dispatched_at IS NULL
        ORDER BY position ASC`
    );
    return result.rows.map(toDomainEvent);
  }

  public async markDispatched(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) {
      return;
    }
    const placeholders = eventIds.map((_, index) => `$${index + 1}`).join(', ');
    await this.db.query(
      `UPDATE domain_events
          SET dispatched_at = now()
        WHERE dispatched_at IS NULL
          AND event_id IN (${placeholders})`,
      eventIds
    );
  }
}

export class NoopDomainEventDispatchLog implements DomainEventDispatchLog {
  public async loadPending(): Promise<IDomainEvent[]> {
    return [];
  }

  public async markDispatched(): Promise<void> {}
}

function toDomainEvent(row: DomainEventRow): IDomainEvent {
  return {
    eventId: row.event_id,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    occurredOn: row.occurred_on instanceof Date ? row.occurred_on : new Date(row.occurred_on),
    payload: asPayload(row.payload),
  };
}

export function asPayload(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return asPayload(JSON.parse(value) as unknown);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function asJsonDocument<T>(value: unknown): T {
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return value as T;
}
