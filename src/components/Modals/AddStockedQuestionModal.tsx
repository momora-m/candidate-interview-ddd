import React, { useState } from 'react';
import { X, Plus, HelpCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  QuestionCategory,
  TargetInterviewerRole,
  QUESTION_CATEGORY_LABELS,
  TARGET_ROLE_LABELS,
} from '@/domain/company/StockedReverseQuestion';

interface AddStockedQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCompanyId?: string;
}

export const AddStockedQuestionModal: React.FC<AddStockedQuestionModalProps> = ({
  isOpen,
  onClose,
  defaultCompanyId,
}) => {
  const { companies, addStockedQuestion } = useApp();

  const [companyId, setCompanyId] = useState<string>(defaultCompanyId || companies[0]?.id || '');
  const [category, setCategory] = useState<QuestionCategory>('TECH_STACK');
  const [targetRole, setTargetRole] = useState<TargetInterviewerRole>('LEAD_ENGINEER');
  const [questionText, setQuestionText] = useState('');
  const [hypothesisOrIntent, setHypothesisOrIntent] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await addStockedQuestion({
        companyId,
        category,
        targetRole,
        questionText,
        hypothesisOrIntent,
      });

      if (res.success) {
        onClose();
        setQuestionText('');
        setHypothesisOrIntent('');
      } else {
        setError(res.error || '質問ストックの追加に失敗しました。');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">企業逆質問プールの追加</h2>
              <p className="text-xs text-slate-400">検証仮説とターゲット面接官を定義します</p>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">対象企業</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">対象面接官ロール</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as TargetInterviewerRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(TARGET_ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">質問カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(QUESTION_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              質問文 (Question Text)
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="例: マイクロサービス間の分散トランザクションやイベントスキーマ変更の運用方針はどうなっていますか？"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              検証したい仮説・質問の意図 (Hypothesis / Intent)
            </label>
            <textarea
              rows={2}
              value={hypothesisOrIntent}
              onChange={(e) => setHypothesisOrIntent(e.target.value)}
              placeholder="例: 技術ブログの言及内容から、実際の現場での泥臭い課題感やアーキテクチャ成熟度を見極める"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? '追加中...' : '質問プールにストック'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
