import type { CompanyId } from '@/domain/company/CompanyId';
import type { TargetCompany } from '@/domain/company/TargetCompany';
import type { ITargetCompanyRepository } from '@/domain/repositories/ITargetCompanyRepository';
import { PersistenceError } from '../PersistenceError';
import type { SqlClient } from '../SqlClient';
import {
  stockedQuestionToRow,
  targetCompanyToParams,
  toTargetCompany,
  type StockedQuestionRow,
  type TargetCompanyRow,
} from '../mappers/TargetCompanyMapper';
import { appendDomainEvents } from '../outbox/domainEvents';
import { groupBy, insertRows, isForeignKeyViolation } from '../sql';

const COMPANY_COLUMNS = [
  'id',
  'name',
  'product_summary',
  'target_audience',
  'revenue_stream',
  'key_competitors',
  'primary_languages',
  'cloud_platform',
  'architecture_highlights',
  'tech_blog_urls',
  'overall_attractiveness_summary',
  'corporate_mission',
  'created_at',
  'updated_at',
] as const;

const QUESTION_COLUMNS = [
  'id',
  'company_id',
  'category',
  'target_role',
  'question_text',
  'hypothesis_or_intent',
  'sort_order',
] as const;

/**
 * TargetCompany aggregate repository.
 * Stocked questions are replaced in full on every save (ADR-0006).
 * Domain events are appended in the same transaction (ADR-0012).
 */
export class PostgresTargetCompanyRepository implements ITargetCompanyRepository {
  public constructor(private readonly db: SqlClient) {}

  public async findById(id: CompanyId): Promise<TargetCompany | null> {
    const companies = await this.loadCompanies('WHERE c.id = $1', [id.value]);
    return companies[0] ?? null;
  }

  public async findAll(): Promise<TargetCompany[]> {
    return this.loadCompanies('', []);
  }

  public async save(company: TargetCompany): Promise<void> {
    const params = targetCompanyToParams(company);
    const assignments = COMPANY_COLUMNS.filter((column) => column !== 'id' && column !== 'created_at')
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(', ');

    await this.db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO target_companies (${COMPANY_COLUMNS.join(', ')})
         VALUES (${COMPANY_COLUMNS.map((_, index) => `$${index + 1}`).join(', ')})
         ON CONFLICT (id) DO UPDATE SET ${assignments}`,
        params
      );

      await appendDomainEvents(tx, 'TargetCompany', company.domainEvents);

      await tx.query('DELETE FROM stocked_reverse_questions WHERE company_id = $1', [
        company.id.value,
      ]);

      await insertRows(
        tx,
        'stocked_reverse_questions',
        QUESTION_COLUMNS,
        company.stockedQuestions.map((question, index) =>
          stockedQuestionToRow(company.id.value, question, index)
        )
      );
    });
  }

  public async delete(id: CompanyId): Promise<void> {
    try {
      await this.db.query('DELETE FROM target_companies WHERE id = $1', [id.value]);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new PersistenceError(
          `企業 ${id.value} は選考応募から参照されているため削除できません。先に応募を削除してください。`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  private async loadCompanies(whereSql: string, params: readonly unknown[]): Promise<TargetCompany[]> {
    const companies = await this.db.query<TargetCompanyRow>(
      `SELECT ${COMPANY_COLUMNS.map((column) => `c.${column}`).join(', ')}
         FROM target_companies c
         ${whereSql}
        ORDER BY c.created_at ASC, c.id ASC`,
      params
    );
    if (companies.rows.length === 0) {
      return [];
    }

    const ids = companies.rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const questions = await this.db.query<StockedQuestionRow>(
      `SELECT ${QUESTION_COLUMNS.join(', ')}
         FROM stocked_reverse_questions
        WHERE company_id IN (${placeholders})
        ORDER BY company_id ASC, sort_order ASC, id ASC`,
      ids
    );
    const grouped = groupBy(questions.rows, (row) => row.company_id);
    return companies.rows.map((row) => toTargetCompany(row, grouped.get(row.id) ?? []));
  }
}
