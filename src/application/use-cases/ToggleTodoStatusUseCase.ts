import { IJobApplicationRepository } from '@/domain/repositories/IJobApplicationRepository';
import { ApplicationId } from '@/domain/application/ApplicationId';
import { TodoId } from '@/domain/todo/TodoId';
import { TaskStatus, TaskStatusCode } from '@/domain/todo/TaskStatus';
import { Result } from '@/domain/shared/Result';

export interface ToggleTodoStatusCommand {
  applicationId: string;
  todoId: string;
  newStatus?: TaskStatusCode;
}

export class ToggleTodoStatusUseCase {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
  ) {}

  public async execute(command: ToggleTodoStatusCommand): Promise<Result<void>> {
    const appIdRes = ApplicationId.create(command.applicationId);
    if (appIdRes.isFailure()) return Result.fail(appIdRes.getError());

    const todoIdRes = TodoId.create(command.todoId);
    if (todoIdRes.isFailure()) return Result.fail(todoIdRes.getError());

    const app = await this.applicationRepo.findById(appIdRes.getValue());
    if (!app) {
      return Result.fail(`応募 (ID: ${command.applicationId}) が見つかりません。`);
    }

    const todo = app.todos.find((t) => t.id.equals(todoIdRes.getValue()));
    if (!todo) {
      return Result.fail(`TODO (ID: ${command.todoId}) が見つかりません。`);
    }

    let nextStatus: TaskStatus;
    if (command.newStatus) {
      const sRes = TaskStatus.create(command.newStatus);
      if (sRes.isFailure()) return Result.fail(sRes.getError());
      nextStatus = sRes.getValue();
    } else {
      nextStatus = todo.status.isDone ? TaskStatus.todo() : TaskStatus.done();
    }

    const res = app.updateTodoStatus(todo.id, nextStatus);
    if (res.isFailure()) return res;

    await this.applicationRepo.save(app);
    return Result.ok(undefined);
  }
}
