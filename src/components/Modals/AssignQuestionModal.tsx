import React, { useState } from 'react';
import { X, HelpCircle, Check, Copy } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StockedReverseQuestionDTO } from '@/application/dtos/CandidateApplicationDTOs';

interface AssignQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  sessionId: string;
  companyId: string;
}

export const AssignQuestionModal: React.FC<AssignQuestionModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  sessionId,
  companyId,
}) => {
  const { companies, assignReverseQuestion } = useApp();

  const company = companies.find((c) => c.id === companyId);
  const stockedQuestions = company?.stockedQuestions || [];

  const [selectedStockedId, setSelectedStockedId] = useState<string>(stockedQuestions[0]?.id || '');
  const [customizedText, setCustomizedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectQuestion = (q: StockedReverseQuestionDTO) => {
    setSelectedStockedId(q.id);
    setCustomizedText(q.questionText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockedId) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await assignReverseQuestion({
        applicationId,
        sessionId,
        stockedQuestionId: selectedStockedId,
        customizedText: customizedText || undefined,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || '逆質問のアサインに失敗しました。');
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
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">逆質問のスナップショット割当 (VO Copy)</h2>
              <p className="text-xs text-slate-400">
                企業プールから質問を選び、面接官や文脈に合わせて文面を調整してアサインします
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
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              企業ストックから逆質問を選択
            </label>
            {stockedQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg">
                企業プールに逆質問がまだ登録されていません。「志望企業」タブからストックを追加してください。
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stockedQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => handleSelectQuestion(q)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedStockedId === q.id
                        ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {q.targetRoleLabel}
                      </span>
                      <span className="text-[10px] text-slate-400">{q.categoryLabel}</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">{q.questionText}</p>
                    <p className="text-[11px] text-slate-400 mt-1 italic">狙い: {q.hypothesisOrIntent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              面接専用のカスタマイズ文面 (Customized Snapshot)
            </label>
            <textarea
              rows={3}
              value={customizedText}
              onChange={(e) => setCustomizedText(e.target.value)}
              placeholder="〇〇さんの登壇資料を拝見して...のように、この面接固有の文脈に合わせて調整できます"
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
              disabled={submitting || !selectedStockedId}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{submitting ? 'アサイン中...' : '不変VOとして面接に割り当て'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
