import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { container } from '@/infrastructure/container';
import {
  TargetCompanyDTO,
  JobApplicationDTO,
  DomainEventDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import { ScheduleInterviewCommand } from '@/application/use-cases/ScheduleInterviewUseCase';
import { RescheduleInterviewCommand } from '@/application/use-cases/RescheduleInterviewUseCase';
import { RecordInterviewReflectionCommand } from '@/application/use-cases/RecordInterviewReflectionUseCase';
import { RecordQuestionAnswerCommand } from '@/application/use-cases/RecordQuestionAnswerUseCase';
import { AssignReverseQuestionCommand } from '@/application/use-cases/AssignReverseQuestionUseCase';
import { AddStockedReverseQuestionCommand } from '@/application/use-cases/AddStockedReverseQuestionUseCase';
import { CreateTargetCompanyCommand } from '@/application/use-cases/CreateTargetCompanyUseCase';
import { CreateJobApplicationCommand } from '@/application/use-cases/CreateJobApplicationUseCase';
import { AddCustomTodoCommand } from '@/application/use-cases/AddCustomTodoUseCase';
import { IDomainEvent } from '@/domain/shared/DomainEvent';
import confetti from 'canvas-confetti';

interface AppContextType {
  companies: TargetCompanyDTO[];
  applications: JobApplicationDTO[];
  events: DomainEventDTO[];
  loading: boolean;
  refresh: () => Promise<void>;
  scheduleInterview: (cmd: ScheduleInterviewCommand) => Promise<{ success: boolean; error?: string }>;
  rescheduleInterview: (cmd: RescheduleInterviewCommand) => Promise<{ success: boolean; error?: string }>;
  assignReverseQuestion: (cmd: AssignReverseQuestionCommand) => Promise<{ success: boolean; error?: string }>;
  recordQuestionAnswer: (cmd: RecordQuestionAnswerCommand) => Promise<{ success: boolean; error?: string }>;
  recordReflection: (cmd: RecordInterviewReflectionCommand) => Promise<{ success: boolean; error?: string }>;
  toggleTodoStatus: (appId: string, todoId: string) => Promise<{ success: boolean; error?: string }>;
  addCustomTodo: (cmd: AddCustomTodoCommand) => Promise<{ success: boolean; error?: string }>;
  advanceStage: (appId: string) => Promise<{ success: boolean; nextStageName?: string; error?: string }>;
  acceptOffer: (appId: string) => Promise<{ success: boolean; error?: string }>;
  rejectOrWithdraw: (appId: string, action: 'REJECT' | 'WITHDRAW', reason?: string) => Promise<{ success: boolean; error?: string }>;
  createTargetCompany: (cmd: CreateTargetCompanyCommand) => Promise<{ success: boolean; error?: string }>;
  addStockedQuestion: (cmd: AddStockedReverseQuestionCommand) => Promise<{ success: boolean; error?: string }>;
  createJobApplication: (cmd: CreateJobApplicationCommand) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<TargetCompanyDTO[]>([]);
  const [applications, setApplications] = useState<JobApplicationDTO[]>([]);
  const [events, setEvents] = useState<DomainEventDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await container.getDashboardData();
      setCompanies(data.companies);
      setApplications(data.applications);
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Subscribe to domain event bus
    const unsub = container.eventBus.subscribe('*', (event: IDomainEvent) => {
      console.log('⚡ Domain Event Dispatched:', event.eventType, event);
      if (
        event.eventType === 'SELECTION_STAGE_ADVANCED' ||
        event.eventType === 'JOB_APPLICATION_OFFER_ACCEPTED'
      ) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    });

    return () => unsub();
  }, [refresh]);

  const scheduleInterview = async (cmd: ScheduleInterviewCommand) => {
    const res = await container.scheduleInterview.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const rescheduleInterview = async (cmd: RescheduleInterviewCommand) => {
    const res = await container.rescheduleInterview.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const assignReverseQuestion = async (cmd: AssignReverseQuestionCommand) => {
    const res = await container.assignReverseQuestion.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const recordQuestionAnswer = async (cmd: RecordQuestionAnswerCommand) => {
    const res = await container.recordQuestionAnswer.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const recordReflection = async (cmd: RecordInterviewReflectionCommand) => {
    const res = await container.recordInterviewReflection.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const toggleTodoStatus = async (appId: string, todoId: string) => {
    const res = await container.toggleTodoStatus.execute({
      applicationId: appId,
      todoId,
    });
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const addCustomTodo = async (cmd: AddCustomTodoCommand) => {
    const res = await container.addCustomTodo.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const advanceStage = async (appId: string) => {
    const res = await container.advanceSelectionStage.execute({ applicationId: appId });
    await refresh();
    return res.isSuccess()
      ? { success: true, nextStageName: res.getValue().nextStageName }
      : { success: false, error: res.getError() };
  };

  const acceptOffer = async (appId: string) => {
    const res = await container.rejectOrWithdrawApplication.execute({
      applicationId: appId,
      action: 'ACCEPT_OFFER',
    });
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const rejectOrWithdraw = async (
    appId: string,
    action: 'REJECT' | 'WITHDRAW',
    reason?: string
  ) => {
    const res = await container.rejectOrWithdrawApplication.execute({
      applicationId: appId,
      action,
      reason,
    });
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const createTargetCompany = async (cmd: CreateTargetCompanyCommand) => {
    const res = await container.createTargetCompany.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const addStockedQuestion = async (cmd: AddStockedReverseQuestionCommand) => {
    const res = await container.addStockedReverseQuestion.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  const createJobApplication = async (cmd: CreateJobApplicationCommand) => {
    const res = await container.createJobApplication.execute(cmd);
    await refresh();
    return res.isSuccess()
      ? { success: true }
      : { success: false, error: res.getError() };
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        applications,
        events,
        loading,
        refresh,
        scheduleInterview,
        rescheduleInterview,
        assignReverseQuestion,
        recordQuestionAnswer,
        recordReflection,
        toggleTodoStatus,
        addCustomTodo,
        advanceStage,
        acceptOffer,
        rejectOrWithdraw,
        createTargetCompany,
        addStockedQuestion,
        createJobApplication,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
