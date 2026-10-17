import { Entity } from '../shared/Entity';
import { Result } from '../shared/Result';
import { TodoId } from './TodoId';
import { ApplicationId } from '../application/ApplicationId';
import { InterviewSessionId } from '../interview/InterviewSessionId';
import { TaskType } from './TaskType';
import { TaskStatus } from './TaskStatus';
import { TaskPriority } from './TaskPriority';

export interface PreparationTodoProps {
  id: TodoId;
  applicationId: ApplicationId;
  interviewSessionId?: InterviewSessionId;
  taskType: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export class PreparationTodo extends Entity<TodoId> {
  private _applicationId: ApplicationId;
  private _interviewSessionId?: InterviewSessionId;
  private _taskType: TaskType;
  private _title: string;
  private _description: string;
  private _status: TaskStatus;
  private _priority: TaskPriority;
  private _dueDate?: Date;
  private readonly _createdAt: Date;
  private _completedAt?: Date;

  private constructor(props: PreparationTodoProps) {
    super(props.id);
    this._applicationId = props.applicationId;
    this._interviewSessionId = props.interviewSessionId;
    this._taskType = props.taskType;
    this._title = props.title;
    this._description = props.description;
    this._status = props.status;
    this._priority = props.priority;
    this._dueDate = props.dueDate;
    this._createdAt = props.createdAt;
    this._completedAt = props.completedAt;
  }

  public get applicationId(): ApplicationId {
    return this._applicationId;
  }

  public get interviewSessionId(): InterviewSessionId | undefined {
    return this._interviewSessionId;
  }

  public get taskType(): TaskType {
    return this._taskType;
  }

  public get title(): string {
    return this._title;
  }

  public get description(): string {
    return this._description;
  }

  public get status(): TaskStatus {
    return this._status;
  }

  public get priority(): TaskPriority {
    return this._priority;
  }

  public get dueDate(): Date | undefined {
    return this._dueDate;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get completedAt(): Date | undefined {
    return this._completedAt;
  }

  public static create(
    props: Omit<PreparationTodoProps, 'id' | 'createdAt' | 'status'> & {
      id?: TodoId;
      status?: TaskStatus;
      createdAt?: Date;
    }
  ): Result<PreparationTodo> {
    if (!props.title || props.title.trim().length === 0) {
      return Result.fail('タスクのタイトルは必須です。');
    }

    const id = props.id || TodoId.create().getValue();
    const status = props.status || TaskStatus.todo();

    return Result.ok(
      new PreparationTodo({
        id,
        applicationId: props.applicationId,
        interviewSessionId: props.interviewSessionId,
        taskType: props.taskType,
        title: props.title.trim(),
        description: props.description || '',
        status,
        priority: props.priority,
        dueDate: props.dueDate,
        createdAt: props.createdAt || new Date(),
        completedAt: status.isCompleted ? new Date() : undefined,
      })
    );
  }

  public static hydrate(props: PreparationTodoProps): PreparationTodo {
    return new PreparationTodo(props);
  }

  public updateStatus(newStatus: TaskStatus): Result<void> {
    this._status = newStatus;
    if (newStatus.isCompleted) {
      this._completedAt = new Date();
    } else {
      this._completedAt = undefined;
    }
    return Result.ok(undefined);
  }

  public markAsDone(): Result<void> {
    return this.updateStatus(TaskStatus.done());
  }

  public markAsTodo(): Result<void> {
    return this.updateStatus(TaskStatus.todo());
  }
}
