import type {
  DomainEventDTO,
  JobApplicationDTO,
  TargetCompanyDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import type { CandidateReadModel } from '@/application/read-model/screenReadModel';
import { asJsonDocument, asPayload } from '@/infrastructure/persistence/outbox/domainEvents';
import type { SqlClient } from '@/infrastructure/persistence/SqlClient';

interface DocumentRow extends Record<string, unknown> {
  document: unknown;
}

interface EventRow extends Record<string, unknown> {
  event_id: string;
  aggregate_id: string;
  event_type: string;
  occurred_on: Date | string;
  payload: unknown;
}

const EVENT_LIMIT = 200;

/**
 * One SELECT returns a screen DTO. Documents are written by the projector, not by query code.
 */
export class PostgresCandidateReadModel implements CandidateReadModel {
  public constructor(private readonly db: SqlClient) {}

  public async listCompanies(): Promise<TargetCompanyDTO[]> {
    const result = await this.db.query<DocumentRow>(
      `SELECT document
         FROM read_model_companies
        ORDER BY created_at ASC, id ASC`
    );
    return result.rows.map((row) => asJsonDocument<TargetCompanyDTO>(row.document));
  }

  public async getCompany(id: string): Promise<TargetCompanyDTO | null> {
    const result = await this.db.query<DocumentRow>(
      `SELECT document FROM read_model_companies WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? asJsonDocument<TargetCompanyDTO>(row.document) : null;
  }

  public async listApplications(): Promise<JobApplicationDTO[]> {
    const result = await this.db.query<DocumentRow>(
      `SELECT document
         FROM read_model_applications
        ORDER BY created_at ASC, id ASC`
    );
    return result.rows.map((row) => asJsonDocument<JobApplicationDTO>(row.document));
  }

  public async getApplication(id: string): Promise<JobApplicationDTO | null> {
    const result = await this.db.query<DocumentRow>(
      `SELECT document FROM read_model_applications WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? asJsonDocument<JobApplicationDTO>(row.document) : null;
  }

  public async listEvents(): Promise<DomainEventDTO[]> {
    const result = await this.db.query<EventRow>(
      `SELECT event_id, aggregate_id, event_type, occurred_on, payload
         FROM domain_events
        ORDER BY occurred_on DESC, position DESC
        LIMIT ${EVENT_LIMIT}`
    );
    return result.rows.map((row) => ({
      eventId: row.event_id,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      occurredOn:
        row.occurred_on instanceof Date
          ? row.occurred_on.toISOString()
          : new Date(row.occurred_on).toISOString(),
      payload: asPayload(row.payload),
    }));
  }

  public async replaceAll(snapshot: {
    companies: readonly TargetCompanyDTO[];
    applications: readonly JobApplicationDTO[];
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query('DELETE FROM read_model_applications');
      await tx.query('DELETE FROM read_model_companies');
      for (const company of snapshot.companies) {
        await upsertCompany(tx, company);
      }
      for (const application of snapshot.applications) {
        await upsertApplication(tx, application);
      }
    });
  }

  public async upsertCompany(company: TargetCompanyDTO): Promise<void> {
    await upsertCompany(this.db, company);
  }

  public async upsertApplication(application: JobApplicationDTO): Promise<void> {
    await upsertApplication(this.db, application);
  }

  public async removeCompany(id: string): Promise<void> {
    await this.db.query('DELETE FROM read_model_companies WHERE id = $1', [id]);
  }

  public async removeApplication(id: string): Promise<void> {
    await this.db.query('DELETE FROM read_model_applications WHERE id = $1', [id]);
  }

  public async appendEvent(): Promise<void> {
    // The outbox table is the event read model. The row is inserted with the aggregate.
  }
}

async function upsertCompany(
  db: { query: SqlClient['query'] },
  company: TargetCompanyDTO
): Promise<void> {
  await db.query(
    `INSERT INTO read_model_companies (id, document, created_at, updated_at)
     VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET document = EXCLUDED.document,
           updated_at = EXCLUDED.updated_at`,
    [company.id, JSON.stringify(company), company.createdAt, company.updatedAt]
  );
}

async function upsertApplication(
  db: { query: SqlClient['query'] },
  application: JobApplicationDTO
): Promise<void> {
  await db.query(
    `INSERT INTO read_model_applications (id, company_id, document, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET company_id = EXCLUDED.company_id,
           document = EXCLUDED.document,
           updated_at = EXCLUDED.updated_at`,
    [
      application.id,
      application.companyId,
      JSON.stringify(application),
      application.createdAt,
      application.updatedAt,
    ]
  );
}
