import type { ApplicationId } from '@/domain/application/ApplicationId';
import type { JobApplication } from '@/domain/application/JobApplication';
import type { CompanyId } from '@/domain/company/CompanyId';
import type { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { PersistenceError } from '../PersistenceError';
import type { SqlClient, SqlQuery } from '../SqlClient';
import {
  assignedQuestionToRow,
  interviewSessionToRow,
  jobApplicationToParams,
  preparationTodoToRow,
  proposedScheduleToRow,
  proposedSlotToRow,
  toJobApplication,
  type AssignedQuestionRow,
  type InterviewSessionRow,
  type JobApplicationRow,
  type PreparationTodoRow,
  type ProposedScheduleRow,
  type ProposedScheduleSlotRow,
} from '../mappers/JobApplicationMapper';
import { appendDomainEvents } from '../outbox/domainEvents';
import { groupBy, insertRows, isForeignKeyViolation } from '../sql';

const APPLICATION_COLUMNS = [
  'id',
  'company_id',
  'position_title',
  'job_description_url',
  'salary_min_amount',
  'salary_max_amount',
  'salary_currency',
  'target_seniority',
  'desirability_rating',
  'why_this_role',
  'value_proposition',
  'career_growth_alignment',
  'current_stage',
  'status',
  'version',
  'created_at',
  'updated_at',
] as const;

const PROPOSAL_COLUMNS = [
  'id',
  'application_id',
  'stage_code',
  'status',
  'format_type',
  'meeting_url',
  'meeting_platform',
  'meeting_passcode',
  'meeting_notes',
  'location_name',
  'room_name',
  'reception_instructions',
  'estimated_travel_minutes',
  'note',
  'confirmed_slot_index',
  'sort_order',
  'created_at',
  'updated_at',
] as const;

const PROPOSAL_SLOT_COLUMNS = [
  'proposed_schedule_id',
  'slot_index',
  'starts_at',
  'ends_at',
] as const;

const SESSION_COLUMNS = [
  'id',
  'application_id',
  'stage_code',
  'starts_at',
  'ends_at',
  'format_type',
  'meeting_url',
  'meeting_platform',
  'meeting_passcode',
  'meeting_notes',
  'location_name',
  'room_name',
  'reception_instructions',
  'estimated_travel_minutes',
  'interviewer_names',
  'is_completed',
  'reflection_candidate_performance_rating',
  'reflection_company_impression_rating',
  'reflection_key_learnings',
  'reflection_concerns',
  'reflection_next_actions',
  'reflection_recorded_at',
  'sort_order',
  'created_at',
  'updated_at',
] as const;

const ASSIGNED_QUESTION_COLUMNS = [
  'id',
  'session_id',
  'source_question_id',
  'category',
  'customized_question_text',
  'is_asked',
  'obtained_answer',
  'insight_rating',
  'sort_order',
] as const;

const TODO_COLUMNS = [
  'id',
  'application_id',
  'interview_session_id',
  'task_type',
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'created_at',
  'completed_at',
  'sort_order',
] as const;

/**
 * JobApplication aggregate repository.
 *
 * ADR-0006: one transaction upserts the root, deletes every child row that
 * belongs to the aggregate, then inserts the in-memory children again.
 * Last write wins. The candidate is a single actor, so lost updates from
 * concurrent writers are outside the domain.
 *
 * ADR-0012: domain events raised by the aggregate are inserted in the same
 * transaction. The caller publishes them only after commit.
 */
export class PostgresJobApplicationRepository implements IJobApplicationRepository {
  public constructor(private readonly db: SqlClient) {}

  public async findById(id: ApplicationId): Promise<JobApplication | null> {
    const applications = await this.loadApplications('WHERE a.id = $1', [id.value]);
    return applications[0] ?? null;
  }

  public async findByCompanyId(companyId: CompanyId): Promise<JobApplication[]> {
    return this.loadApplications('WHERE a.company_id = $1', [companyId.value]);
  }

  public async findAll(): Promise<JobApplication[]> {
    return this.loadApplications('', []);
  }

  public async save(application: JobApplication): Promise<void> {
    const params = jobApplicationToParams(application);
    const assignments = APPLICATION_COLUMNS.filter(
      (column) => column !== 'id' && column !== 'created_at'
    )
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(', ');

    try {
      await this.db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO job_applications (${APPLICATION_COLUMNS.join(', ')})
           VALUES (${APPLICATION_COLUMNS.map((_, index) => `$${index + 1}`).join(', ')})
           ON CONFLICT (id) DO UPDATE SET ${assignments}`,
          params
        );

        await appendDomainEvents(tx, 'JobApplication', application.domainEvents);
        await replaceChildren(tx, application);
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new PersistenceError(
          `応募 ${application.id.value} の保存に失敗しました。参照先の志望企業 ${application.companyId.value} が存在するか確認してください。`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  public async delete(id: ApplicationId): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM assigned_reverse_questions
          WHERE session_id IN (
            SELECT id FROM interview_sessions WHERE application_id = $1
          )`,
        [id.value]
      );
      await tx.query('DELETE FROM preparation_todos WHERE application_id = $1', [id.value]);
      await tx.query(
        `DELETE FROM proposed_schedule_slots
          WHERE proposed_schedule_id IN (
            SELECT id FROM proposed_schedules WHERE application_id = $1
          )`,
        [id.value]
      );
      await tx.query('DELETE FROM proposed_schedules WHERE application_id = $1', [id.value]);
      await tx.query('DELETE FROM interview_sessions WHERE application_id = $1', [id.value]);
      await tx.query('DELETE FROM job_applications WHERE id = $1', [id.value]);
    });
  }

  private async loadApplications(
    whereSql: string,
    params: readonly unknown[]
  ): Promise<JobApplication[]> {
    const applications = await this.db.query<JobApplicationRow>(
      `SELECT ${APPLICATION_COLUMNS.map((column) => `a.${column}`).join(', ')}
         FROM job_applications a
         ${whereSql}
        ORDER BY a.created_at ASC, a.id ASC`,
      params
    );
    if (applications.rows.length === 0) {
      return [];
    }

    const ids = applications.rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const [sessions, todos, proposals] = await Promise.all([
      this.db.query<InterviewSessionRow>(
        `SELECT ${SESSION_COLUMNS.join(', ')}
           FROM interview_sessions
          WHERE application_id IN (${placeholders})
          ORDER BY application_id ASC, sort_order ASC, id ASC`,
        ids
      ),
      this.db.query<PreparationTodoRow>(
        `SELECT ${TODO_COLUMNS.join(', ')}
           FROM preparation_todos
          WHERE application_id IN (${placeholders})
          ORDER BY application_id ASC, sort_order ASC, id ASC`,
        ids
      ),
      this.db.query<ProposedScheduleRow>(
        `SELECT ${PROPOSAL_COLUMNS.join(', ')}
           FROM proposed_schedules
          WHERE application_id IN (${placeholders})
          ORDER BY application_id ASC, sort_order ASC, id ASC`,
        ids
      ),
    ]);

    const proposalIds = proposals.rows.map((row) => row.id);
    const proposalSlots = proposalIds.length
      ? await this.db.query<ProposedScheduleSlotRow>(
          `SELECT ${PROPOSAL_SLOT_COLUMNS.join(', ')}
             FROM proposed_schedule_slots
            WHERE proposed_schedule_id IN (${proposalIds.map((_, index) => `$${index + 1}`).join(', ')})
            ORDER BY proposed_schedule_id ASC, slot_index ASC`,
          proposalIds
        )
      : { rows: [] as ProposedScheduleSlotRow[], rowCount: 0 };

    const sessionIds = sessions.rows.map((row) => row.id);
    const questions = sessionIds.length
      ? await this.db.query<AssignedQuestionRow>(
          `SELECT ${ASSIGNED_QUESTION_COLUMNS.join(', ')}
             FROM assigned_reverse_questions
            WHERE session_id IN (${sessionIds.map((_, index) => `$${index + 1}`).join(', ')})
            ORDER BY session_id ASC, sort_order ASC, id ASC`,
          sessionIds
        )
      : { rows: [] as AssignedQuestionRow[], rowCount: 0 };

    const sessionsByApplication = groupBy(sessions.rows, (row) => row.application_id);
    const todosByApplication = groupBy(todos.rows, (row) => row.application_id);
    const questionsBySession = groupBy(questions.rows, (row) => row.session_id);
    const proposalsByApplication = groupBy(proposals.rows, (row) => row.application_id);

    return applications.rows.map((row) => {
      const applicationSessions = sessionsByApplication.get(row.id) ?? [];
      const applicationQuestions = applicationSessions.flatMap(
        (session) => questionsBySession.get(session.id) ?? []
      );
      const applicationProposals = proposalsByApplication.get(row.id) ?? [];
      const applicationSlots = proposalSlots.rows.filter((slot) =>
        applicationProposals.some((proposal) => proposal.id === slot.proposed_schedule_id)
      );
      return toJobApplication(
        row,
        applicationSessions,
        applicationQuestions,
        todosByApplication.get(row.id) ?? [],
        applicationProposals,
        applicationSlots
      );
    });
  }
}

async function replaceChildren(tx: SqlQuery, application: JobApplication): Promise<void> {
  const applicationId = application.id.value;

  await tx.query(
    `DELETE FROM assigned_reverse_questions
      WHERE session_id IN (
        SELECT id FROM interview_sessions WHERE application_id = $1
      )`,
    [applicationId]
  );
  await tx.query('DELETE FROM preparation_todos WHERE application_id = $1', [applicationId]);
  await tx.query(
    `DELETE FROM proposed_schedule_slots
      WHERE proposed_schedule_id IN (
        SELECT id FROM proposed_schedules WHERE application_id = $1
      )`,
    [applicationId]
  );
  await tx.query('DELETE FROM proposed_schedules WHERE application_id = $1', [applicationId]);
  await tx.query('DELETE FROM interview_sessions WHERE application_id = $1', [applicationId]);

  await insertRows(
    tx,
    'interview_sessions',
    SESSION_COLUMNS,
    application.sessions.map((session, index) =>
      interviewSessionToRow(applicationId, session, index)
    )
  );

  const assignedRows = application.sessions.flatMap((session) =>
    session.assignedQuestions.map((question, index) =>
      assignedQuestionToRow(session.id.value, question, index)
    )
  );
  await insertRows(tx, 'assigned_reverse_questions', ASSIGNED_QUESTION_COLUMNS, assignedRows);

  await insertRows(
    tx,
    'preparation_todos',
    TODO_COLUMNS,
    application.todos.map((todo, index) => preparationTodoToRow(todo, index))
  );

  await insertRows(
    tx,
    'proposed_schedules',
    PROPOSAL_COLUMNS,
    application.proposedSchedules.map((proposal, index) =>
      proposedScheduleToRow(applicationId, proposal, index)
    )
  );
  await insertRows(
    tx,
    'proposed_schedule_slots',
    PROPOSAL_SLOT_COLUMNS,
    application.proposedSchedules.flatMap((proposal) =>
      proposal.slots.map((slot, index) => proposedSlotToRow(proposal.id.value, slot, index))
    )
  );
}
