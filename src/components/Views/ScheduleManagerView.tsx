import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CandidateScheduleConflictDomainService } from '@/domain/services/CandidateScheduleConflictDomainService';
import { TimeWindow } from '@/domain/interview/TimeWindow';
import { InterviewFormat } from '@/domain/interview/InterviewFormat';
import { MeetingUrl } from '@/domain/interview/MeetingUrl';
import { JobApplication } from '@/domain/application/JobApplication';

export const ScheduleManagerView: React.FC = () => {
  const { applications, proposeSchedule, confirmProposedSchedule, cancelProposedSchedule } = useApp();
  const [proposalAppId, setProposalAppId] = useState(applications[0]?.id ?? '');
  const [proposalDate, setProposalDate] = useState(() => {
    const day = new Date();
    day.setDate(day.getDate() + 5);
    return day.toISOString().split('T')[0];
  });
  const [firstSlot, setFirstSlot] = useState('10:00');
  const [secondSlot, setSecondSlot] = useState('15:00');
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalMessage, setProposalMessage] = useState<string | null>(null);

  // Conflict Simulator State
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [testStartTime, setTestStartTime] = useState('14:00');
  const [testDuration, setTestDuration] = useState(60);
  const [testFormatType, setTestFormatType] = useState<'ONLINE' | 'IN_PERSON'>('IN_PERSON');
  const [testTravelMinutes, setTestTravelMinutes] = useState(45);

  const [simulationResult, setSimulationResult] = useState<{
    hasConflict: boolean;
    reason?: string;
    isHardOverlap?: boolean;
    conflictingSummary?: string;
  } | null>(null);

  // Flatten all sessions across applications sorted by date
  const pendingProposals = applications.flatMap((app) =>
    app.proposedSchedules
      .filter((proposal) => proposal.statusCode === 'PENDING')
      .map((proposal) => ({
        ...proposal,
        appId: app.id,
        companyName: app.companyName,
        positionTitle: app.positionTitle,
      }))
  );

  const submitProposal = async () => {
    setProposalError(null);
    setProposalMessage(null);
    const slots = [firstSlot, secondSlot]
      .map((time) => time.trim())
      .filter(Boolean)
      .map((time) => {
        const start = new Date(`${proposalDate}T${time}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return { startTime: start.toISOString(), endTime: end.toISOString() };
      });
    const result = await proposeSchedule({
      applicationId: proposalAppId,
      slots,
      formatType: 'ONLINE',
      meetingUrl: 'https://meet.google.com/candidate-hold',
      note: '画面から提示した候補日',
    });
    if (!result.success) {
      setProposalError(result.error || '候補日を提示できませんでした。');
      return;
    }
    setProposalMessage('候補日を返答待ちとして登録しました。他社の確定面接と提示中の枠は塞いであります。');
  };

  const allSessions = applications
    .flatMap((app) =>
      app.sessions.map((s) => ({
        ...s,
        appId: app.id,
        companyName: app.companyName,
        positionTitle: app.positionTitle,
      }))
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const runSimulation = () => {
    const [h, m] = testStartTime.split(':').map(Number);
    const start = new Date(`${testDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const end = new Date(start.getTime() + testDuration * 60 * 1000);

    const timeWindowRes = TimeWindow.create(start, end);
    if (timeWindowRes.isFailure()) {
      setSimulationResult({
        hasConflict: true,
        reason: timeWindowRes.getError(),
      });
      return;
    }

    let formatRes;
    if (testFormatType === 'ONLINE') {
      formatRes = InterviewFormat.createOnline(
        MeetingUrl.create('https://zoom.us/j/test').getValue()
      );
    } else {
      formatRes = InterviewFormat.createInPerson(
        'テスト先オフィス',
        '会議室',
        undefined,
        testTravelMinutes
      );
    }

    const domainService = new CandidateScheduleConflictDomainService();

    // Map DTOs back into domain check or use domain logic
    // Construct simple dummy JobApplications for conflict checking
    const conflictRes = domainService.checkConflicts(
      timeWindowRes.getValue(),
      formatRes.getValue(),
      // We can check against the actual sessions directly
      applications as unknown as JobApplication[]
    );

    if (conflictRes.isFailure()) {
      const err = conflictRes.getError();
      setSimulationResult({
        hasConflict: true,
        reason: err.overlapReason,
        isHardOverlap: err.isHardOverlap,
        conflictingSummary: `${err.conflictingStageName} (${err.conflictingTimeWindowJP})`,
      });
    } else {
      setSimulationResult({
        hasConflict: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">面接タイムライン & 移動バッファ整合性診断</h2>
        <p className="text-xs text-slate-400">
          全社の面接スケジュールを統合管理し、移動時間（Travel Buffer）による過密日程を自動検知します
        </p>
      </div>

      {/* Simulator Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              面接候補日時のリアルタイム重複・移動バッファ診断シミュレータ
            </h3>
            <p className="text-xs text-slate-400">
              提示された候補日程が、既存の他社面接や移動時間と衝突しないか即座にドメイン計算します
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">候補日</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">開始時刻</label>
            <input
              type="time"
              value={testStartTime}
              onChange={(e) => setTestStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">所要時間</label>
            <select
              value={testDuration}
              onChange={(e) => setTestDuration(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value={30}>30分</option>
              <option value={60}>60分 (1時間)</option>
              <option value={90}>90分</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">形式 & 移動</label>
            <select
              value={testFormatType}
              onChange={(e) => setTestFormatType(e.target.value as 'ONLINE' | 'IN_PERSON')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="ONLINE">オンライン (バッファ10分)</option>
              <option value="IN_PERSON">対面オフィス (移動45分)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={runSimulation}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
            >
              衝突診断を実行
            </button>
          </div>
        </div>

        {/* Simulation Output Card */}
        {simulationResult && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              simulationResult.hasConflict
                ? simulationResult.isHardOverlap
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              {simulationResult.hasConflict ? (
                simulationResult.isHardOverlap ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {simulationResult.hasConflict
                    ? simulationResult.isHardOverlap
                      ? '【確定日程重複エラー】直接の時間帯重複を検出しました'
                      : '【過密スケジュール警告】移動・準備バッファの不足を検出しました'
                    : '【スケジュール適合OK】既存面接および移動バッファとの衝突はありません'}
                </p>
                {simulationResult.reason && <p>{simulationResult.reason}</p>}
                {simulationResult.conflictingSummary && (
                  <p className="text-[11px] opacity-80">
                    該当セッション: {simulationResult.conflictingSummary}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">企業へ出している候補日 ({pendingProposals.length})</h3>
        <p className="text-xs text-slate-400">
          カジュアル面談も面接と同じ枠です。確定枠とも、他社へ提示中の候補日とも重ねられません。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs text-slate-400 space-y-1">
            <span>応募</span>
            <select
              value={proposalAppId}
              onChange={(event) => setProposalAppId(event.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-sm text-white"
            >
              {applications.filter((app) => !app.isTerminal).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>日付</span>
            <input
              type="date"
              value={proposalDate}
              onChange={(event) => setProposalDate(event.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>第1希望</span>
            <input
              type="time"
              value={firstSlot}
              onChange={(event) => setFirstSlot(event.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>第2希望（任意）</span>
            <input
              type="time"
              value={secondSlot}
              onChange={(event) => setSecondSlot(event.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-sm text-white"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={submitProposal}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          候補日を提示する
        </button>
        {proposalError && <p className="text-xs text-rose-300">{proposalError}</p>}
        {proposalMessage && <p className="text-xs text-emerald-300">{proposalMessage}</p>}

        {pendingProposals.length === 0 ? (
          <p className="text-xs text-slate-500">返答待ちの候補日はありません。</p>
        ) : (
          <div className="space-y-3">
            {pendingProposals.map((proposal) => (
              <div key={proposal.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {proposal.companyName} <span className="text-xs text-slate-400">({proposal.positionTitle})</span>
                    </p>
                    <p className="text-xs text-indigo-300">【{proposal.stageLabel}】{proposal.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await cancelProposedSchedule(proposal.appId, proposal.id);
                      if (!result.success) {
                        setProposalError(result.error || '候補日を取り下げられませんでした。');
                      }
                    }}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-300"
                  >
                    取り下げる
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {proposal.slots.map((slot) => (
                    <button
                      key={slot.slotIndex}
                      type="button"
                      onClick={async () => {
                        const result = await confirmProposedSchedule(
                          proposal.appId,
                          proposal.id,
                          slot.slotIndex
                        );
                        if (!result.success) {
                          setProposalError(result.error || '候補日を確定できませんでした。');
                        }
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white"
                    >
                      {slot.timeWindowJP} を確定
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>全社面接統合スケジュール ({allSessions.length})</span>
        </h3>

        {allSessions.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-6 text-center">
            確定している面接日程はありません。
          </p>
        ) : (
          <div className="space-y-3">
            {allSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(session.startTime).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-bold text-indigo-400">
                      {new Date(session.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white">{session.companyName}</span>
                      <span className="text-xs text-slate-400">({session.positionTitle})</span>
                    </div>
                    <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                      【{session.stageLabel}】 {session.timeWindowJP}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center space-x-1.5">
                    {session.formatType === 'ONLINE' ? (
                      <Video className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{session.formatSummary}</span>
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      session.isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {session.isCompleted ? '完了' : '確定'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
