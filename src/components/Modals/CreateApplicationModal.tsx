import React, { useEffect, useState } from 'react';
import { X, Briefcase, Plus, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StageCode, STAGE_DEFINITIONS } from '@/domain/application/SelectionStage';
import { DesirabilityRating } from '@/domain/application/PositionDetails';

interface CreateApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function resolveSelectedCompanyId(
  companies: readonly { id: string }[],
  currentId: string
): string {
  if (companies.some((company) => company.id === currentId)) {
    return currentId;
  }
  return companies[0]?.id ?? '';
}

export const CreateApplicationModal: React.FC<CreateApplicationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { companies, createJobApplication } = useApp();

  const [companyId, setCompanyId] = useState(companies[0]?.id || '');

  useEffect(() => {
    const nextCompanyId = resolveSelectedCompanyId(companies, companyId);
    if (nextCompanyId !== companyId) {
      setCompanyId(nextCompanyId);
    }
  }, [companies, companyId]);
  const [positionTitle, setPositionTitle] = useState('');
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState('');
  const [salaryMin, setSalaryMin] = useState<number | undefined>(10000000);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(14000000);
  const [targetSeniority, setTargetSeniority] = useState('Staff / Lead');
  const [desirabilityRating, setDesirabilityRating] = useState<DesirabilityRating>(5);
  const [whyThisRole, setWhyThisRole] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [careerGrowthAlignment, setCareerGrowthAlignment] = useState('');
  const [initialStageCode, setInitialStageCode] = useState<StageCode>('CASUAL_INTERVIEW');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!companyId) {
      setError(
        companies.length === 0
          ? '先に志望企業を登録してください。'
          : '志望先企業を選択してください。'
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await createJobApplication({
        companyId,
        positionTitle,
        jobDescriptionUrl: jobDescriptionUrl || undefined,
        salaryMin,
        salaryMax,
        targetSeniority: targetSeniority || undefined,
        desirabilityRating,
        whyThisRole: whyThisRole || undefined,
        valueProposition: valueProposition || undefined,
        careerGrowthAlignment: careerGrowthAlignment || undefined,
        initialStageCode,
      });

      if (res.success) {
        onClose();
        setPositionTitle('');
        setWhyThisRole('');
      } else {
        setError(res.error || '選考エントリーの作成に失敗しました。');
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
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">選考エントリーの新規作成</h2>
              <p className="text-xs text-slate-400">ポジション固有の志望動機と選考パイプラインを設定します</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">志望先企業 (必須)</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">職種・ポジション名 (必須)</label>
              <input
                type="text"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">想定シニアリティ</label>
              <input
                type="text"
                value={targetSeniority}
                onChange={(e) => setTargetSeniority(e.target.value)}
                placeholder="Staff / Tech Lead / EM"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">想定年収下限 (円)</label>
              <input
                type="number"
                step="500000"
                value={salaryMin ?? ''}
                onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="10000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">想定年収上限 (円)</label>
              <input
                type="number"
                step="500000"
                value={salaryMax ?? ''}
                onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="14000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">志望度スコア</label>
              <div className="flex items-center space-x-1 mt-1.5">
                {([1, 2, 3, 4, 5] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDesirabilityRating(r)}
                    className={`p-1 rounded-md transition-all ${
                      desirabilityRating >= r ? 'text-amber-400' : 'text-slate-700'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">現在の開始選考フェーズ</label>
            <select
              value={initialStageCode}
              onChange={(e) => setInitialStageCode(e.target.value as StageCode)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {Object.entries(STAGE_DEFINITIONS).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
              ポジション固有の志望動機・価値提案 (Position Motivation VO)
            </h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                なぜこのポジション・職種なのか (Why this role?)
              </label>
              <textarea
                rows={2}
                value={whyThisRole}
                onChange={(e) => setWhyThisRole(e.target.value)}
                placeholder="このチームが直面しているDDD刷新とマイクロサービス移行をアーキテクトとしてリードしたいため。"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                自分が提供できる独自の再現性ある価値 (Value Proposition)
              </label>
              <textarea
                rows={2}
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
                placeholder="過去5年間の決済基盤におけるイベントソーシング移行と耐障害性設計の実務知見。"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
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
              <span>{submitting ? '作成中...' : '選考エントリーを作成'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
