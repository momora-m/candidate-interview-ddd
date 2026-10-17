import React, { useState } from 'react';
import { X, Award, CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PerformanceRating } from '@/domain/interview/InterviewReflection';

interface RecordReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  sessionId: string;
  companyName: string;
  stageLabel: string;
}

export const RecordReflectionModal: React.FC<RecordReflectionModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  sessionId,
  companyName,
  stageLabel,
}) => {
  const { recordReflection } = useApp();

  const [perfRating, setPerfRating] = useState<PerformanceRating>(4);
  const [impressionRating, setImpressionRating] = useState<PerformanceRating>(5);
  const [learnings, setLearnings] = useState('');
  const [concerns, setConcerns] = useState('');
  const [nextActionNotes, setNextActionNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await recordReflection({
        applicationId,
        sessionId,
        candidatePerformanceRating: perfRating,
        companyImpressionRating: impressionRating,
        keyLearningsAndInsights: learnings,
        concernsOrRedFlags: concerns || undefined,
        nextActionNotes,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || '振り返りの保存に失敗しました。');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">面接振り返り & インサイト記録</h2>
              <p className="text-xs text-slate-400">
                {companyName} - {stageLabel}
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
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                自己パフォーマンス評価
              </label>
              <div className="flex items-center space-x-1">
                {([1, 2, 3, 4, 5] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPerfRating(r)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      perfRating >= r
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-400 ml-2">{perfRating} / 5</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                企業・チームへの志望度/印象
              </label>
              <div className="flex items-center space-x-1">
                {([1, 2, 3, 4, 5] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setImpressionRating(r)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      impressionRating >= r
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
                <span className="text-xs font-bold text-emerald-400 ml-2">{impressionRating} / 5</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              面接での学び・得られた情報・好印象だった点 (必須)
            </label>
            <textarea
              rows={3}
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              placeholder="開発文化、アーキテクチャの意思決定プロセス、面接官の熱量など..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              懸念点・確認すべきRed Flags（任意）
            </label>
            <textarea
              rows={2}
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="オンコールの頻度、組織の意思決定スピード、給与テーブルの上限など..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              次回選考に向けたアクション・留意点 (必須)
            </label>
            <textarea
              rows={2}
              value={nextActionNotes}
              onChange={(e) => setNextActionNotes(e.target.value)}
              placeholder="次回EM面接に向けて、チームマネジメントと評価方針に関する逆質問を準備する..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? '保存中...' : '振り返りを記録 & タスク自動完了'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
