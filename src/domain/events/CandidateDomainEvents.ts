import { BaseDomainEvent } from '../shared/DomainEvent';

export class InterviewSessionScheduledEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly sessionId: string,
    public readonly stageCode: string,
    public readonly timeWindowJP: string,
    public readonly formatSummary: string
  ) {
    super(aggregateId, 'INTERVIEW_SESSION_SCHEDULED', {
      sessionId,
      stageCode,
      timeWindowJP,
      formatSummary,
    });
  }
}

export class InterviewSessionRescheduledEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly sessionId: string,
    public readonly previousTimeJP: string,
    public readonly newTimeJP: string
  ) {
    super(aggregateId, 'INTERVIEW_SESSION_RESCHEDULED', {
      sessionId,
      previousTimeJP,
      newTimeJP,
    });
  }
}

export class ReverseQuestionAssignedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly sessionId: string,
    public readonly questionId: string,
    public readonly questionText: string
  ) {
    super(aggregateId, 'REVERSE_QUESTION_ASSIGNED', {
      sessionId,
      questionId,
      questionText,
    });
  }
}

export class ReverseQuestionAnswerRecordedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly sessionId: string,
    public readonly questionId: string,
    public readonly answer: string,
    public readonly insightRating?: number
  ) {
    super(aggregateId, 'REVERSE_QUESTION_ANSWER_RECORDED', {
      sessionId,
      questionId,
      answer,
      insightRating,
    });
  }
}

export class InterviewReflectionRecordedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly sessionId: string,
    public readonly performanceRating: number,
    public readonly companyImpressionRating: number,
    public readonly keyLearnings: string
  ) {
    super(aggregateId, 'INTERVIEW_REFLECTION_RECORDED', {
      sessionId,
      performanceRating,
      companyImpressionRating,
      keyLearnings,
    });
  }
}

export class PreparationTodoCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly todoId: string,
    public readonly taskTypeCode: string,
    public readonly title: string
  ) {
    super(aggregateId, 'PREPARATION_TODO_CREATED', {
      todoId,
      taskTypeCode,
      title,
    });
  }
}

export class PreparationTodoStatusChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly todoId: string,
    public readonly title: string,
    public readonly previousStatus: string,
    public readonly newStatus: string
  ) {
    super(aggregateId, 'PREPARATION_TODO_STATUS_CHANGED', {
      todoId,
      title,
      previousStatus,
      newStatus,
    });
  }
}

export class SelectionStageAdvancedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly previousStage: string,
    public readonly newStage: string
  ) {
    super(aggregateId, 'SELECTION_STAGE_ADVANCED', {
      previousStage,
      newStage,
    });
  }
}

export class JobApplicationRejectedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly currentStage: string,
    public readonly reason: string
  ) {
    super(aggregateId, 'JOB_APPLICATION_REJECTED', {
      currentStage,
      reason,
    });
  }
}

export class JobApplicationWithdrawnEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly currentStage: string,
    public readonly reason: string
  ) {
    super(aggregateId, 'JOB_APPLICATION_WITHDRAWN', {
      currentStage,
      reason,
    });
  }
}

export class JobApplicationOfferAcceptedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly positionTitle: string
  ) {
    super(aggregateId, 'JOB_APPLICATION_OFFER_ACCEPTED', {
      positionTitle,
    });
  }
}
