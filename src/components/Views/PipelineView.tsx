import React, { useState } from 'react';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Award,
  AlertTriangle,
  Plus,
  Video,
  MapPin,
  Star,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { JobApplicationDTO, InterviewSessionDTO, PreparationTodoDTO } from '@/application/dtos/CandidateApplicationDTOs';
import { STAGE_DEFINITIONS, StageCode } from '@/domain/application/SelectionStage';

interface PipelineViewProps {
  onOpenScheduleModal: (appId?: string) => void;
  onOpenReflectionModal: (appId: string, sessionId: string, companyName: string, stageLabel: string) => void;
  onOpenAssignQuestionModal: (appId: string, sessionId: string, companyId: string) => void;
  onOpenAddTodoModal: (appId: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  onOpenScheduleModal,
  onOpenReflectionModal,
  onOpenAssignQuestionModal,
  onOpenAddTodoModal,
}) => {
  const {
    applications,
    companies,
    toggleTodoStatus,
    recordQuestionAnswer,
    advanceStage,
    acceptOffer,
    rejectOrWithdraw,
  } = useApp();

  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [insightRatingDraft, setInsightRatingDraft] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0];
  const targetCompany = companies.find((c) => c.id === selectedApp?.companyId);

  const handleToggleTodo = async (appId: string, todoId: string) => {
    await toggleTodoStatus(appId, todoId);
  };

  const handleSaveAnswer = async (sessionId: string, questionId: string) => {
    if (!selectedApp) return;
    const res = await recordQuestionAnswer({
      applicationId: selectedApp.id,
      sessionId,
      questionId,
      answer: answerDraft,
      insightRating: insightRatingDraft,
    });
    if (res.success) {
      setAnsweringQuestionId(null);
      setAnswerDraft('');
    } else {
      setActionError(res.error || '回答の記録に失敗しました。');
    }
  };

  const handleAdvanceStage = async (appId: string) => {
    setActionError(null);
    const res = await advanceStage(appId);
    if (!res.success) {
      setActionError(res.error || '次ステージへの移行に失敗しました。');
    }
  };

  const stagesList = Object.entries(STAGE_DEFINITIONS).filter(
    ([code]) => code !== 'REJECTED' && code !== 'WITHDRAWN'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-sm">
          <span className="text-xs font-semibold text-indigo-400">進行中の選考エントリー</span>
          <p className="text-2xl font-bold text-white mt-1">
            {applications.filter((a) => !a.isTerminal).length} <span className="text-xs font-normal text-slate-400">社</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/20 shadow-sm">
          <span className="text-xs font-semibold text-cyan-400">確定済みの次回面接</span>
          <p className="text-2xl font-bold text-white mt-1">
            {applications.flatMap((a) => a.sessions).filter((s) => !s.isCompleted).length} <span className="text-xs font-normal text-slate-400">件</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/20 shadow-sm">
          <span className="text-xs font-semibold text-amber-400">事前準備・残TODO</span>
          <p className="text-2xl font-bold text-white mt-1">
            {applications.flatMap((a) => a.todos).filter((t) => t.statusCode !== 'DONE' && t.statusCode !== 'SKIPPED').length} <span className="text-xs font-normal text-slate-400">タスク</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 shadow-sm">
          <span className="text-xs font-semibold text-emerald-400">蓄積インサイト & 逆質問回答</span>
          <p className="text-2xl font-bold text-white mt-1">
            {applications.flatMap((a) => a.sessions).flatMap((s) => s.assignedQuestions).filter((q) => q.isAsked).length} <span className="text-xs font-normal text-slate-400">件記録</span>
          </p>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs whitespace-pre-wrap font-medium">
            <span className="font-bold">ドメイン不変条件チェックエラー:</span> {actionError}
          </div>
        </div>
      )}

      {/* Main Content Area: Left Sidebar (Application List) & Right Panel (Application Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              選考エントリー一覧 ({applications.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {applications.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              const pendingTodos = app.todos.filter((t) => !t.completedAt).length;

              return (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedAppId(app.id);
                    setActionError(null);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-lg'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-white tracking-tight">
                        {app.companyName}
                      </span>
                      <h4 className="text-xs text-slate-300 font-medium mt-0.5 line-clamp-1">
                        {app.positionTitle}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: app.desirabilityRating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {app.currentStageLabel}
                    </span>
                    <span className="text-slate-400 font-medium">{app.salaryFormatted}</span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <CheckSquare className="w-3 h-3 text-indigo-400" />
                      <span>残TODO: {pendingTodos}件</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      <span>面接: {app.sessions.length}回</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Application Detail & Workspace */}
        {selectedApp && (
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white">{selectedApp.companyName}</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {selectedApp.currentStageLabel}
                    </span>
                    {selectedApp.isTerminal && (
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-800 text-slate-300">
                        {selectedApp.statusLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 font-semibold mt-0.5">
                    {selectedApp.positionTitle}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    想定年収: <span className="text-slate-200 font-semibold">{selectedApp.salaryFormatted}</span>
                    {selectedApp.targetSeniority && (
                      <span className="ml-3">シニアリティ: <span className="text-slate-200 font-semibold">{selectedApp.targetSeniority}</span></span>
                    )}
                  </p>
                </div>

                {/* Stage Progression & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!selectedApp.isTerminal && (
                    <>
                      <button
                        onClick={() => onOpenScheduleModal(selectedApp.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>面接日程を確定</span>
                      </button>

                      <button
                        onClick={() => handleAdvanceStage(selectedApp.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>次ステージへ昇格 (Advance)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Selection Pipeline Progress Stepper */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  選考パイプライン進行状況 (Selection Pipeline Stepper)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {stagesList.map(([code, meta]) => {
                    const isCurrent = selectedApp.currentStageCode === code;
                    const stageOrder = meta.order;
                    const currentOrder = STAGE_DEFINITIONS[selectedApp.currentStageCode]?.order || 1;
                    const isPassed = stageOrder < currentOrder;

                    return (
                      <div
                        key={code}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : isPassed
                            ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          {isPassed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : isCurrent ? (
                            <Circle className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                          ) : (
                            <Circle className="w-3 h-3 text-slate-600" />
                          )}
                          <span className="text-[10px] font-bold">Step {meta.order}</span>
                        </div>
                        <p className="text-[11px] font-semibold truncate">{meta.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Position Motivation VO summary */}
              {(selectedApp.whyThisRole || selectedApp.valueProposition) && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ポジション固有の志望動機 & 提供価値 (Position Motivation VO)</span>
                  </div>
                  {selectedApp.whyThisRole && (
                    <p className="text-slate-300">
                      <span className="text-slate-400 font-medium">志望理由:</span> {selectedApp.whyThisRole}
                    </p>
                  )}
                  {selectedApp.valueProposition && (
                    <p className="text-slate-300">
                      <span className="text-slate-400 font-medium">提供価値:</span> {selectedApp.valueProposition}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section 1: Interview Sessions & Assigned Reverse Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    面接セッション & 逆質問スナップショット ({selectedApp.sessions.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenScheduleModal(selectedApp.id)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>面接日程を追加</span>
                </button>
              </div>

              {selectedApp.sessions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    まだ面接日程が登録されていません。
                  </p>
                  <button
                    onClick={() => onOpenScheduleModal(selectedApp.id)}
                    className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    面接日程を確定・登録する
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedApp.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4"
                    >
                      {/* Session Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">
                              【{session.stageLabel}】
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                session.isCompleted
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {session.isCompleted ? '面接・振り返り完了' : '面接予定 / 準備中'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold mt-1 flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{session.timeWindowJP}</span>
                          </p>
                        </div>

                        {/* Format & Travel Buffer badge */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium flex items-center space-x-1.5">
                            {session.formatType === 'ONLINE' ? (
                              <Video className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{session.formatSummary}</span>
                          </span>

                          {!session.reflection && (
                            <button
                              onClick={() =>
                                onOpenReflectionModal(
                                  selectedApp.id,
                                  session.id,
                                  selectedApp.companyName,
                                  session.stageLabel
                                )
                              }
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 transition-colors"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>振り返りを入力</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reflection Results (if present) */}
                      {session.reflection && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                              <Award className="w-3.5 h-3.5" />
                              <span>面接振り返り結果 (Interview Reflection VO)</span>
                            </span>
                            <div className="flex items-center space-x-3 text-[11px]">
                              <span className="text-slate-300">
                                手応え:{' '}
                                <span className="font-bold text-amber-400">
                                  {session.reflection.candidatePerformanceRating}/5
                                </span>
                              </span>
                              <span className="text-slate-300">
                                企業印象:{' '}
                                <span className="font-bold text-emerald-400">
                                  {session.reflection.companyImpressionRating}/5
                                </span>
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-200">
                            <span className="text-slate-400 font-medium">学び・得られた情報:</span>{' '}
                            {session.reflection.keyLearningsAndInsights}
                          </p>
                          {session.reflection.concernsOrRedFlags && (
                            <p className="text-rose-300">
                              <span className="text-rose-400 font-medium">懸念点:</span>{' '}
                              {session.reflection.concernsOrRedFlags}
                            </p>
                          )}
                          <p className="text-slate-300">
                            <span className="text-slate-400 font-medium">次回アクション:</span>{' '}
                            {session.reflection.nextActionNotes}
                          </p>
                        </div>
                      )}

                      {/* Assigned Reverse Questions */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-400 flex items-center space-x-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>面接でぶつける逆質問スナップショット (Assigned VO)</span>
                          </span>
                          <button
                            onClick={() =>
                              onOpenAssignQuestionModal(
                                selectedApp.id,
                                session.id,
                                selectedApp.companyId
                              )
                            }
                            className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3 text-indigo-400" />
                            <span>企業プールから質問を割当</span>
                          </button>
                        </div>

                        {session.assignedQuestions.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded-xl">
                            この面接にまだ逆質問がアサインされていません。「企業プールから質問を割当」ボタンで設定してください。
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {session.assignedQuestions.map((q) => (
                              <div
                                key={q.id}
                                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <p className="text-xs text-slate-200 font-medium">
                                    Q. {q.customizedQuestionText}
                                  </p>
                                  {q.isAsked ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      回答記録済 ({q.insightRating}/5)
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setAnsweringQuestionId(q.id);
                                        setAnswerDraft(q.obtainedAnswer || '');
                                      }}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
                                    >
                                      回答を記録
                                    </button>
                                  )}
                                </div>

                                {q.obtainedAnswer && (
                                  <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 border border-slate-800">
                                    <span className="text-slate-500 font-medium mr-1.5">A. (面接官回答):</span>
                                    {q.obtainedAnswer}
                                  </div>
                                )}

                                {answeringQuestionId === q.id && (
                                  <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-2 mt-2">
                                    <label className="block text-[11px] font-semibold text-slate-300">
                                      面接官からの回答メモ (Obtained Answer)
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={answerDraft}
                                      onChange={(e) => setAnswerDraft(e.target.value)}
                                      placeholder="面接官の回答内容や得られたインサイト..."
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1">
                                        <span className="text-[10px] text-slate-400 mr-1">回答納得度:</span>
                                        {([1, 2, 3, 4, 5] as const).map((r) => (
                                          <button
                                            key={r}
                                            type="button"
                                            onClick={() => setInsightRatingDraft(r)}
                                            className={`p-1 rounded ${
                                              insightRatingDraft >= r
                                                ? 'text-amber-400'
                                                : 'text-slate-700'
                                            }`}
                                          >
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          type="button"
                                          onClick={() => setAnsweringQuestionId(null)}
                                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                                        >
                                          キャンセル
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveAnswer(session.id, q.id)}
                                          className="px-3 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
                                        >
                                          回答を保存
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Preparation & Follow-up TODOs */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    選考タスク & 事前準備TODO ({selectedApp.todos.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenAddTodoModal(selectedApp.id)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>カスタムTODO追加</span>
                </button>
              </div>

              {selectedApp.todos.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">
                  面接日程を確定すると、ステージに応じたTODOが自動生成されます。
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedApp.todos.map((todo) => {
                    const isDone = todo.statusCode === 'DONE';

                    return (
                      <div
                        key={todo.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isDone
                            ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTodo(selectedApp.id, todo.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-slate-900 border-slate-700 hover:border-indigo-500'
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <p
                              className={`text-xs font-medium ${
                                isDone ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{todo.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${todo.priorityColor}15`,
                              color: todo.priorityColor,
                              border: `1px solid ${todo.priorityColor}40`,
                            }}
                          >
                            {todo.priorityLabel}
                          </span>
                          {todo.isBlocking && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              昇格必須
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
