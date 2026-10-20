import React, { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, MapPin, Video, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StageCode, STAGE_DEFINITIONS } from '@/domain/application/SelectionStage';
import { InterviewSessionDTO } from '@/application/dtos/CandidateApplicationDTOs';
import { resolveSelectedApplicationId } from '@/components/resolveSelectedApplicationId';

const DURATION_CHOICES = [30, 45, 60, 90, 120];

export interface InterviewRevisionTarget {
  applicationId: string;
  session: InterviewSessionDTO;
}

function localDateInput(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function localTimeInput(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function durationFromWindow(startIso: string, endIso: string): number {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return minutes > 0 ? minutes : 60;
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultApplicationId?: string;
  revision?: InterviewRevisionTarget | null;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  defaultApplicationId,
  revision = null,
}) => {
  const { applications, scheduleInterview, reviseInterview } = useApp();

  const [applicationId, setApplicationId] = useState('');
  const [stageCode, setStageCode] = useState<StageCode>('FIRST_TECHNICAL');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [formatType, setFormatType] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [meetingUrl, setMeetingUrl] = useState('https://zoom.us/j/1234567890');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [locationName, setLocationName] = useState('東京本社オフィス');
  const [roomName, setRoomName] = useState('会議室A (3F)');
  const [travelMinutes, setTravelMinutes] = useState(45);
  const [interviewers, setInterviewers] = useState('テックリード 佐藤, EM 山田');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectionKey = useRef<string | null>(null);

  useEffect(() => {
    const key = !isOpen
      ? null
      : revision
        ? `edit:${revision.session.id}`
        : `new:${defaultApplicationId ?? ''}`;
    const contextChanged = selectionKey.current !== key;
    selectionKey.current = key;
    if (revision && contextChanged) {
      const session = revision.session;
      setApplicationId(revision.applicationId);
      setStageCode(session.stageCode);
      setDate(localDateInput(session.startTime));
      setStartTimeStr(localTimeInput(session.startTime));
      setDurationMinutes(durationFromWindow(session.startTime, session.endTime));
      setFormatType(session.formatType);
      setMeetingUrl(session.meetingUrl || 'https://zoom.us/j/1234567890');
      setMeetingPasscode(session.meetingPasscode || '');
      setLocationName(session.locationName || '東京本社オフィス');
      setRoomName(session.roomName || '会議室A (3F)');
      setTravelMinutes(session.formatType === 'IN_PERSON' ? session.travelBufferMinutes : 45);
      setInterviewers(session.interviewerNames.join(', '));
      setError(null);
      return;
    }
    if (revision) {
      return;
    }
    setApplicationId((current) =>
      resolveSelectedApplicationId(
        applications,
        contextChanged ? '' : current,
        defaultApplicationId
      )
    );
  }, [isOpen, applications, defaultApplicationId, revision]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!applicationId) {
      setError(
        applications.some((application) => !application.isTerminal)
          ? '対象の選考エントリーを選択してください。'
          : '先に選考エントリーを登録してください。'
      );
      setSubmitting(false);
      return;
    }

    try {
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const start = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

      const payload = {
        applicationId,
        startTime: start,
        endTime: end,
        formatType,
        meetingUrl: formatType === 'ONLINE' ? meetingUrl : undefined,
        meetingPasscode: formatType === 'ONLINE' ? meetingPasscode : undefined,
        locationName: formatType === 'IN_PERSON' ? locationName : undefined,
        roomName: formatType === 'IN_PERSON' ? roomName : undefined,
        receptionInstructions: formatType === 'IN_PERSON' ? revision?.session.receptionInstructions : undefined,
        estimatedTravelMinutes: formatType === 'IN_PERSON' ? travelMinutes : undefined,
        interviewerNames: interviewers.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = revision
        ? await reviseInterview({ ...payload, sessionId: revision.session.id })
        : await scheduleInterview({ ...payload, stageCode });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || (revision ? '面接の訂正に失敗しました。' : '日程登録に失敗しました。'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {revision ? '確定面接の訂正' : '面接日程の確定・予約'}
              </h2>
              <p className="text-xs text-slate-400">
                {revision
                  ? 'ステージと割り当て済みの逆質問はそのまま、日時・形式・面接官を更新します'
                  : '移動バッファおよび他社面接重複チェックが自動実行されます'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 font-medium whitespace-pre-wrap">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">対象の選考エントリー</label>
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              disabled={Boolean(revision)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
              required
            >
              {applications.filter((a) => !a.isTerminal).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName} - {app.positionTitle} ({app.currentStageLabel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">面接ステージ</label>
            <select
              value={stageCode}
              onChange={(e) => setStageCode(e.target.value as StageCode)}
              disabled={Boolean(revision)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-70"
            >
              {Object.entries(STAGE_DEFINITIONS)
                .filter(([, meta]) => meta.requiresInterview)
                .map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">面接日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">開始時刻</label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">所要時間</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {(DURATION_CHOICES.includes(durationMinutes)
                  ? DURATION_CHOICES
                  : [...DURATION_CHOICES, durationMinutes].sort((left, right) => left - right)
                ).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} 分
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">面接形式 (Interview Format)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormatType('ONLINE')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  formatType === 'ONLINE'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>オンライン (Zoom / Meet)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormatType('IN_PERSON')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  formatType === 'IN_PERSON'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>対面オフィス (移動バッファ要)</span>
              </button>
            </div>
          </div>

          {formatType === 'ONLINE' ? (
            <div className="space-y-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 mb-1">ミーティングURL</label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">パスコード（任意）</label>
                <input
                  type="text"
                  value={meetingPasscode}
                  onChange={(e) => setMeetingPasscode(e.target.value)}
                  placeholder="passcode-123"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">拠点・オフィス名</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="渋谷スクランブルスクエア 24F"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">会議室名</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Meeting Room 7A"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  片道移動見込時間 (分) - <span className="text-amber-400 font-semibold">移動バッファとして考慮されます</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={travelMinutes}
                  onChange={(e) => setTravelMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              面接官・参加者氏名（カンマ区切り）
            </label>
            <input
              type="text"
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
              placeholder="テックリード 佐藤, EM 山田"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {submitting ? '検証 & 保存中...' : revision ? '訂正を保存' : '面接日程を確定・タスク自動生成'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
