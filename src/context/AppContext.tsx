import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { apiRequest } from '@/api/client';
import {
  TargetCompanyDTO,
  JobApplicationDTO,
  DomainEventDTO,
} from '@/application/dtos/CandidateApplicationDTOs';
import { ScheduleInterviewCommand } from '@/application/use-cases/ScheduleInterviewUseCase';
import { ProposeScheduleCommand } from '@/application/use-cases/ProposeScheduleUseCase';
import { RescheduleInterviewCommand } from '@/application/use-cases/RescheduleInterviewUseCase';
import { RecordInterviewReflectionCommand } from '@/application/use-cases/RecordInterviewReflectionUseCase';
import { RecordQuestionAnswerCommand } from '@/application/use-cases/RecordQuestionAnswerUseCase';
import { AssignReverseQuestionCommand } from '@/application/use-cases/AssignReverseQuestionUseCase';
import { AddStockedReverseQuestionCommand } from '@/application/use-cases/AddStockedReverseQuestionUseCase';
import { CreateTargetCompanyCommand } from '@/application/use-cases/CreateTargetCompanyUseCase';
import { CreateJobApplicationCommand } from '@/application/use-cases/CreateJobApplicationUseCase';
import { AddCustomTodoCommand } from '@/application/use-cases/AddCustomTodoUseCase';

interface AppContextType {
  companies: TargetCompanyDTO[];
  applications: JobApplicationDTO[];
  events: DomainEventDTO[];
  eventsLive: boolean;
  loading: boolean;
  loadError: string | null;
  refresh: () => Promise<DomainEventDTO[]>;
  scheduleInterview: (cmd: ScheduleInterviewCommand) => Promise<{ success: boolean; error?: string }>;
  proposeSchedule: (cmd: ProposeScheduleCommand) => Promise<{ success: boolean; error?: string }>;
  confirmProposedSchedule: (
    applicationId: string,
    proposalId: string,
    slotIndex: number
  ) => Promise<{ success: boolean; error?: string }>;
  cancelProposedSchedule: (
    applicationId: string,
    proposalId: string
  ) => Promise<{ success: boolean; error?: string }>;
  decideAfterCasualInterview: (
    applicationId: string,
    decision: 'PROCEED' | 'WITHDRAW'
  ) => Promise<{ success: boolean; nextStageName?: string; error?: string }>;
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

function failure(err: unknown): { success: false; error: string } {
  return { success: false, error: err instanceof Error ? err.message : String(err) };
}

function isNotable(event: DomainEventDTO): boolean {
  return (
    event.eventType === 'SELECTION_STAGE_ADVANCED' ||
    event.eventType === 'JOB_APPLICATION_OFFER_ACCEPTED'
  );
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<TargetCompanyDTO[]>([]);
  const [applications, setApplications] = useState<JobApplicationDTO[]>([]);
  const [events, setEvents] = useState<DomainEventDTO[]>([]);
  const [eventsLive, setEventsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const seenEventIds = useRef(new Set<string>());
  const hasLoadedOnce = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [companyData, applicationData, eventData] = await Promise.all([
        apiRequest<TargetCompanyDTO[]>('/api/companies'),
        apiRequest<JobApplicationDTO[]>('/api/applications'),
        apiRequest<DomainEventDTO[]>('/api/events'),
      ]);
      const unseen = eventData.filter((event) => !seenEventIds.current.has(event.eventId));
      for (const event of eventData) {
        seenEventIds.current.add(event.eventId);
      }
      if (hasLoadedOnce.current && unseen.some(isNotable)) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      hasLoadedOnce.current = true;
      setCompanies(companyData);
      setApplications(applicationData);
      setEvents(eventData);
      setLoadError(null);
      return eventData;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // loadError already holds the message shown in the shell.
    });
  }, [refresh]);

  useEffect(() => {
    const source = new EventSource('/api/events/stream');
    const onDomainEvent = () => {
      refresh().catch(() => {
        // The shell already shows loadError when the follow-up read fails.
      });
    };
    source.addEventListener('domain-event', onDomainEvent);
    source.onopen = () => setEventsLive(true);
    source.onerror = () => setEventsLive(false);
    return () => {
      source.removeEventListener('domain-event', onDomainEvent);
      source.close();
    };
  }, [refresh]);

  const scheduleInterview = async (cmd: ScheduleInterviewCommand) => {
    try {
      const { applicationId, ...body } = cmd;
      await apiRequest(`/api/applications/${encodeURIComponent(applicationId)}/interviews`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const proposeSchedule = async (cmd: ProposeScheduleCommand) => {
    try {
      const { applicationId, ...body } = cmd;
      await apiRequest(`/api/applications/${encodeURIComponent(applicationId)}/proposed-schedules`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const confirmProposedSchedule = async (
    applicationId: string,
    proposalId: string,
    slotIndex: number
  ) => {
    try {
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/proposed-schedules/${encodeURIComponent(proposalId)}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ slotIndex }),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const cancelProposedSchedule = async (applicationId: string, proposalId: string) => {
    try {
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/proposed-schedules/${encodeURIComponent(proposalId)}/cancel`,
        { method: 'POST' }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const decideAfterCasualInterview = async (
    applicationId: string,
    decision: 'PROCEED' | 'WITHDRAW'
  ) => {
    try {
      const body = await apiRequest<{ nextStageName?: string }>(
        `/api/applications/${encodeURIComponent(applicationId)}/casual-decision`,
        {
          method: 'POST',
          body: JSON.stringify({ decision }),
        }
      );
      await refresh();
      return { success: true, nextStageName: body.nextStageName };
    } catch (err) {
      return failure(err);
    }
  };

  const rescheduleInterview = async (cmd: RescheduleInterviewCommand) => {
    try {
      const { applicationId, sessionId, ...body } = cmd;
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(sessionId)}/reschedule`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const assignReverseQuestion = async (cmd: AssignReverseQuestionCommand) => {
    try {
      const { applicationId, sessionId, ...body } = cmd;
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(sessionId)}/questions`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const recordQuestionAnswer = async (cmd: RecordQuestionAnswerCommand) => {
    try {
      const { applicationId, sessionId, questionId, ...body } = cmd;
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/answer`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const recordReflection = async (cmd: RecordInterviewReflectionCommand) => {
    try {
      const { applicationId, sessionId, ...body } = cmd;
      await apiRequest(
        `/api/applications/${encodeURIComponent(applicationId)}/interviews/${encodeURIComponent(sessionId)}/reflection`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const toggleTodoStatus = async (appId: string, todoId: string) => {
    try {
      await apiRequest(
        `/api/applications/${encodeURIComponent(appId)}/todos/${encodeURIComponent(todoId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        }
      );
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const addCustomTodo = async (cmd: AddCustomTodoCommand) => {
    try {
      const { applicationId, ...body } = cmd;
      await apiRequest(`/api/applications/${encodeURIComponent(applicationId)}/todos`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const advanceStage = async (appId: string) => {
    try {
      const body = await apiRequest<{ nextStageName: string }>(
        `/api/applications/${encodeURIComponent(appId)}/advance`,
        { method: 'POST' }
      );
      await refresh();
      return { success: true, nextStageName: body.nextStageName };
    } catch (err) {
      return failure(err);
    }
  };

  const acceptOffer = async (appId: string) => {
    try {
      await apiRequest(`/api/applications/${encodeURIComponent(appId)}/close`, {
        method: 'POST',
        body: JSON.stringify({ action: 'ACCEPT_OFFER' }),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const rejectOrWithdraw = async (
    appId: string,
    action: 'REJECT' | 'WITHDRAW',
    reason?: string
  ) => {
    try {
      await apiRequest(`/api/applications/${encodeURIComponent(appId)}/close`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const createTargetCompany = async (cmd: CreateTargetCompanyCommand) => {
    try {
      await apiRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify(cmd),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const addStockedQuestion = async (cmd: AddStockedReverseQuestionCommand) => {
    try {
      const { companyId, ...body } = cmd;
      await apiRequest(`/api/companies/${encodeURIComponent(companyId)}/questions`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  const createJobApplication = async (cmd: CreateJobApplicationCommand) => {
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify(cmd),
      });
      await refresh();
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        applications,
        events,
        eventsLive,
        loading,
        loadError,
        refresh,
        scheduleInterview,
        proposeSchedule,
        confirmProposedSchedule,
        cancelProposedSchedule,
        decideAfterCasualInterview,
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
