import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { PipelineView } from '@/components/Views/PipelineView';
import { CompanyIntelligenceView } from '@/components/Views/CompanyIntelligenceView';
import { ScheduleManagerView } from '@/components/Views/ScheduleManagerView';
import { DomainExplorerView } from '@/components/Views/DomainExplorerView';
import { InterviewRevisionTarget, ScheduleInterviewModal } from '@/components/Modals/ScheduleInterviewModal';
import { InterviewSessionDTO, TargetCompanyDTO } from '@/application/dtos/CandidateApplicationDTOs';
import { RecordReflectionModal } from '@/components/Modals/RecordReflectionModal';
import { AssignQuestionModal } from '@/components/Modals/AssignQuestionModal';
import { AddStockedQuestionModal } from '@/components/Modals/AddStockedQuestionModal';
import { AddCompanyModal } from '@/components/Modals/AddCompanyModal';
import { CreateApplicationModal } from '@/components/Modals/CreateApplicationModal';
import { AddCustomTodoModal } from '@/components/Modals/AddCustomTodoModal';

export const AppContent: React.FC = () => {
  const { loadError } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');

  // Modal States
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDefaultAppId, setScheduleDefaultAppId] = useState<string | undefined>(undefined);
  const [interviewRevision, setInterviewRevision] = useState<InterviewRevisionTarget | null>(null);

  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [reflectionData, setReflectionData] = useState<{
    appId: string;
    sessionId: string;
    companyName: string;
    stageLabel: string;
  } | null>(null);

  const [assignQuestionModalOpen, setAssignQuestionModalOpen] = useState(false);
  const [assignQuestionData, setAssignQuestionData] = useState<{
    appId: string;
    sessionId: string;
    companyId: string;
  } | null>(null);

  const [addStockedQuestionModalOpen, setAddStockedQuestionModalOpen] = useState(false);
  const [addStockedCompanyId, setAddStockedCompanyId] = useState<string | undefined>(undefined);

  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<TargetCompanyDTO | null>(null);
  const [createAppModalOpen, setCreateAppModalOpen] = useState(false);

  const [addTodoModalOpen, setAddTodoModalOpen] = useState(false);
  const [addTodoAppId, setAddTodoAppId] = useState<string>('');

  const closeScheduleModal = () => {
    setScheduleModalOpen(false);
    setInterviewRevision(null);
  };

  const openScheduleModal = (appId?: string) => {
    setInterviewRevision(null);
    setScheduleDefaultAppId(appId);
    setScheduleModalOpen(true);
  };

  const openInterviewRevision = (applicationId: string, session: InterviewSessionDTO) => {
    setInterviewRevision({ applicationId, session });
    setScheduleDefaultAppId(applicationId);
    setScheduleModalOpen(true);
  };

  const openReflectionModal = (
    appId: string,
    sessionId: string,
    companyName: string,
    stageLabel: string
  ) => {
    setReflectionData({ appId, sessionId, companyName, stageLabel });
    setReflectionModalOpen(true);
  };

  const openAssignQuestionModal = (appId: string, sessionId: string, companyId: string) => {
    setAssignQuestionData({ appId, sessionId, companyId });
    setAssignQuestionModalOpen(true);
  };

  const openAddStockedQuestionModal = (companyId: string) => {
    setAddStockedCompanyId(companyId);
    setAddStockedQuestionModalOpen(true);
  };

  const openAddTodoModal = (appId: string) => {
    setAddTodoAppId(appId);
    setAddTodoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openCreateAppModal={() => setCreateAppModalOpen(true)}
        openAddCompanyModal={() => setAddCompanyModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadError && (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            データを読み込めませんでした。{loadError}
          </div>
        )}
        {activeTab === 'pipeline' && (
          <PipelineView
            onOpenScheduleModal={openScheduleModal}
            onOpenEditInterview={openInterviewRevision}
            onOpenReflectionModal={openReflectionModal}
            onOpenAssignQuestionModal={openAssignQuestionModal}
            onOpenAddTodoModal={openAddTodoModal}
          />
        )}

        {activeTab === 'companies' && (
          <CompanyIntelligenceView
            onOpenAddCompanyModal={() => {
              setEditingCompany(null);
              setAddCompanyModalOpen(true);
            }}
            onOpenEditCompany={(company) => {
              setEditingCompany(company);
              setAddCompanyModalOpen(true);
            }}
            onOpenAddQuestionModal={openAddStockedQuestionModal}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleManagerView onOpenEditInterview={openInterviewRevision} />
        )}

        {activeTab === 'domain' && <DomainExplorerView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>Candidate DDD Platform — Designed with Pure TypeScript Domain Model & Clean Architecture</p>
      </footer>

      {/* Modals */}
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={closeScheduleModal}
        defaultApplicationId={scheduleDefaultAppId}
        revision={interviewRevision}
      />

      {reflectionData && (
        <RecordReflectionModal
          isOpen={reflectionModalOpen}
          onClose={() => {
            setReflectionModalOpen(false);
            setReflectionData(null);
          }}
          applicationId={reflectionData.appId}
          sessionId={reflectionData.sessionId}
          companyName={reflectionData.companyName}
          stageLabel={reflectionData.stageLabel}
        />
      )}

      {assignQuestionData && (
        <AssignQuestionModal
          isOpen={assignQuestionModalOpen}
          onClose={() => {
            setAssignQuestionModalOpen(false);
            setAssignQuestionData(null);
          }}
          applicationId={assignQuestionData.appId}
          sessionId={assignQuestionData.sessionId}
          companyId={assignQuestionData.companyId}
        />
      )}

      <AddStockedQuestionModal
        isOpen={addStockedQuestionModalOpen}
        onClose={() => setAddStockedQuestionModalOpen(false)}
        defaultCompanyId={addStockedCompanyId}
      />

      <AddCompanyModal
        isOpen={addCompanyModalOpen}
        onClose={() => {
          setAddCompanyModalOpen(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
      />

      <CreateApplicationModal
        isOpen={createAppModalOpen}
        onClose={() => setCreateAppModalOpen(false)}
      />

      {addTodoAppId && (
        <AddCustomTodoModal
          isOpen={addTodoModalOpen}
          onClose={() => {
            setAddTodoModalOpen(false);
            setAddTodoAppId('');
          }}
          applicationId={addTodoAppId}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
