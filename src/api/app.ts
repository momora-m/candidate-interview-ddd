import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CandidateUseCases } from '@/application/createCandidateUseCases';
import type { CandidateQueryService } from '@/application/queries/CandidateQueryService';
import { domainError, jsonBody } from './http';
import {
  addQuestionSchema,
  addTodoSchema,
  assignQuestionSchema,
  closeApplicationSchema,
  createApplicationSchema,
  createCompanySchema,
  recordAnswerSchema,
  recordReflectionSchema,
  rescheduleInterviewSchema,
  scheduleInterviewSchema,
  updateTodoSchema,
} from './schemas';

const openapiYamlPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/openapi/openapi.yaml'
);

export interface ApiRuntime {
  persistence: 'memory' | 'postgres';
  queries: CandidateQueryService;
  useCases: CandidateUseCases;
}

export function createApp(runtime: ApiRuntime) {
  const { queries, useCases } = runtime;
  let openapiYamlCache: string | null = null;

  const getOpenapiYaml = () => {
    if (!openapiYamlCache) {
      openapiYamlCache = readFileSync(openapiYamlPath, 'utf8');
    }
    return openapiYamlCache;
  };

  return new Hono()
    .use('*', cors())
    .get('/', (c) =>
      c.json({
        name: 'candidate-interview-api',
        persistence: runtime.persistence,
        documentation: '/docs',
        openapiSpec: '/openapi.yaml',
        health: '/health',
        companies: '/api/companies',
        applications: '/api/applications',
        events: '/api/events',
      })
    )
    .get('/openapi.yaml', (c) => {
      return c.text(getOpenapiYaml(), 200, {
        'content-type': 'application/yaml; charset=utf-8',
      });
    })
    .get(
      '/docs',
      swaggerUI({
        url: '/openapi.yaml',
        title: 'Candidate DDD API Docs (Swagger UI)',
      })
    )
    .get('/health', (c) => c.json({ status: 'ok', persistence: runtime.persistence }))
    .get('/api/companies', async (c) => c.json(await queries.listCompanies()))
    .get('/api/companies/:companyId', async (c) => {
      const company = await queries.getCompany(c.req.param('companyId'));
      if (!company) {
        return c.json({ error: '企業が見つかりません。' }, 404);
      }
      return c.json(company);
    })
    .post('/api/companies', jsonBody(createCompanySchema), async (c) => {
      const result = await useCases.createTargetCompany.execute(c.req.valid('json'));
      if (result.isFailure()) {
        return domainError(c, result.getError());
      }
      const company = await queries.getCompany(result.getValue().id.value);
      return c.json(company, 201);
    })
    .post('/api/companies/:companyId/questions', jsonBody(addQuestionSchema), async (c) => {
      const companyId = c.req.param('companyId');
      const result = await useCases.addStockedReverseQuestion.execute({
        companyId,
        ...c.req.valid('json'),
      });
      if (result.isFailure()) {
        return domainError(c, result.getError());
      }
      const company = await queries.getCompany(companyId);
      return c.json({ questionId: result.getValue().questionId, company }, 201);
    })
    .get('/api/applications', async (c) => c.json(await queries.listApplications()))
    .get('/api/applications/:applicationId', async (c) => {
      const application = await queries.getApplication(c.req.param('applicationId'));
      if (!application) {
        return c.json({ error: '応募が見つかりません。' }, 404);
      }
      return c.json(application);
    })
    .post('/api/applications', jsonBody(createApplicationSchema), async (c) => {
      const result = await useCases.createJobApplication.execute(c.req.valid('json'));
      if (result.isFailure()) {
        return domainError(c, result.getError());
      }
      const application = await queries.getApplication(result.getValue().id.value);
      return c.json(application, 201);
    })
    .post(
      '/api/applications/:applicationId/interviews',
      jsonBody(scheduleInterviewSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.scheduleInterview.execute({
          applicationId,
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        const application = await queries.getApplication(applicationId);
        return c.json({ sessionId: result.getValue().sessionId, application }, 201);
      }
    )
    .post(
      '/api/applications/:applicationId/interviews/:sessionId/reschedule',
      jsonBody(rescheduleInterviewSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.rescheduleInterview.execute({
          applicationId,
          sessionId: c.req.param('sessionId'),
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .post(
      '/api/applications/:applicationId/interviews/:sessionId/questions',
      jsonBody(assignQuestionSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.assignReverseQuestion.execute({
          applicationId,
          sessionId: c.req.param('sessionId'),
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .post(
      '/api/applications/:applicationId/interviews/:sessionId/questions/:questionId/answer',
      jsonBody(recordAnswerSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.recordQuestionAnswer.execute({
          applicationId,
          sessionId: c.req.param('sessionId'),
          questionId: c.req.param('questionId'),
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .post(
      '/api/applications/:applicationId/interviews/:sessionId/reflection',
      jsonBody(recordReflectionSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.recordInterviewReflection.execute({
          applicationId,
          sessionId: c.req.param('sessionId'),
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .post('/api/applications/:applicationId/todos', jsonBody(addTodoSchema), async (c) => {
      const applicationId = c.req.param('applicationId');
      const result = await useCases.addCustomTodo.execute({
        applicationId,
        ...c.req.valid('json'),
      });
      if (result.isFailure()) {
        return domainError(c, result.getError());
      }
      const application = await queries.getApplication(applicationId);
      return c.json({ todoId: result.getValue().todoId, application }, 201);
    })
    .patch(
      '/api/applications/:applicationId/todos/:todoId',
      jsonBody(updateTodoSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.toggleTodoStatus.execute({
          applicationId,
          todoId: c.req.param('todoId'),
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .post('/api/applications/:applicationId/advance', async (c) => {
      const applicationId = c.req.param('applicationId');
      const result = await useCases.advanceSelectionStage.execute({ applicationId });
      if (result.isFailure()) {
        return domainError(c, result.getError());
      }
      const application = await queries.getApplication(applicationId);
      return c.json({ nextStageName: result.getValue().nextStageName, application });
    })
    .post(
      '/api/applications/:applicationId/close',
      jsonBody(closeApplicationSchema),
      async (c) => {
        const applicationId = c.req.param('applicationId');
        const result = await useCases.rejectOrWithdrawApplication.execute({
          applicationId,
          ...c.req.valid('json'),
        });
        if (result.isFailure()) {
          return domainError(c, result.getError());
        }
        return c.json(await queries.getApplication(applicationId));
      }
    )
    .get('/api/events', (c) => c.json(queries.listEvents()));
}

export type AppType = ReturnType<typeof createApp>;
