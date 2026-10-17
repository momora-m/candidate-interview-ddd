import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { IEventBus } from '../events/IEventBus';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { InterviewSessionId } from '@/domain/interview/InterviewSessionId';
import { TaskPriority, PriorityLevel } from '@/domain/todo/TaskPriority';
import { Result } from '@/domain/shared/Result';

export interface AddCustomTodoCommand {
  applicationId: string;
  title: string;
  description?: string;
  priorityLevel?: PriorityLevel;
  dueDate?: string | Date;
  sessionId?: string;
}

export class AddCustomTodoUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly eventBus: IEventBus
  ) {}

  public async execute(command: AddCustomTodoCommand): Promise<Result<{ todoId: string }>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    let priority: TaskPriority | undefined;
    if (command.priorityLevel) {
      const pRes = TaskPriority.create(command.priorityLevel);
      if (pRes.isFailure()) return Result.fail(pRes.getError());
      priority = pRes.getValue();
    }

    let sessId: InterviewSessionId | undefined;
    if (command.sessionId) {
      const sRes = InterviewSessionId.create(command.sessionId);
      if (sRes.isFailure()) return Result.fail(sRes.getError());
      sessId = sRes.getValue();
    }

    const todoRes = app.addCustomTodo({
      title: command.title,
      description: command.description,
      priority,
      dueDate: command.dueDate ? new Date(command.dueDate) : undefined,
      sessionId: sessId,
    });
    if (todoRes.isFailure()) return Result.fail(todoRes.getError());

    await this.applicationRepo.save(app);
    await this.eventBus.publishAll(app.domainEvents);
    app.clearEvents();

    return Result.ok({ todoId: todoRes.getValue().id.value });
  }
}
