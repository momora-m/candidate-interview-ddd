import React, { useState } from 'react';
import {
  Building2,
  Cpu,
  Layers,
  HelpCircle,
  Plus,
  Pencil,
  ExternalLink,
  Target,
  Sparkles,
  Users,
  Code2,
  Globe,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TargetCompanyDTO } from '@/application/dtos/CandidateApplicationDTOs';

interface CompanyIntelligenceViewProps {
  onOpenAddCompanyModal: () => void;
  onOpenEditCompany: (company: TargetCompanyDTO) => void;
  onOpenAddQuestionModal: (companyId: string) => void;
}

export const CompanyIntelligenceView: React.FC<CompanyIntelligenceViewProps> = ({
  onOpenAddCompanyModal,
  onOpenEditCompany,
  onOpenAddQuestionModal,
}) => {
  const { companies } = useApp();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">志望企業インテリジェンス & 逆質問カタログ</h2>
          <p className="text-xs text-slate-400">
            企業集約（TargetCompany Aggregate）と、面接で検証する逆質問プールを管理します
          </p>
        </div>
        <button
          onClick={onOpenAddCompanyModal}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>志望企業を新規登録</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Companies List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            登録企業一覧 ({companies.length})
          </h3>
          <div className="space-y-2.5">
            {companies.map((company) => {
              const isSelected = selectedCompany?.id === company.id;

              return (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-lg'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-sm">
                      {company.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{company.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {company.businessModel.productSummary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="font-semibold text-indigo-300">
                      {company.techStack.cloudPlatform}
                    </span>
                    <span className="flex items-center space-x-1">
                      <HelpCircle className="w-3 h-3 text-cyan-400" />
                      <span>逆質問: {company.stockedQuestions.length}件</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Company Profile & Reverse Question Pool */}
        {selectedCompany && (
          <div className="lg:col-span-8 space-y-6">
            {/* Company Profile Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Target Company Aggregate Root
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1.5">{selectedCompany.name}</h2>
                  {selectedCompany.corporateMission && (
                    <p className="text-xs text-indigo-300 italic mt-0.5">
                      “{selectedCompany.corporateMission}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenEditCompany(selectedCompany)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>企業情報を訂正</span>
                  </button>
                  <button
                    onClick={() => onOpenAddQuestionModal(selectedCompany.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>逆質問を追加</span>
                  </button>
                </div>
              </div>

              {/* Business Model VO & Tech Stack VO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wide">
                    <Target className="w-4 h-4" />
                    <span>Business Model VO</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    <span className="text-slate-400 font-medium">事業・プロダクト:</span>{' '}
                    {selectedCompany.businessModel.productSummary}
                  </p>
                  <p className="text-xs text-slate-200">
                    <span className="text-slate-400 font-medium">ターゲット層:</span>{' '}
                    {selectedCompany.businessModel.targetAudience}
                  </p>
                  <p className="text-xs text-slate-200">
                    <span className="text-slate-400 font-medium">収益構造:</span>{' '}
                    {selectedCompany.businessModel.revenueStream}
                  </p>
                  {selectedCompany.businessModel.keyCompetitors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[11px] text-slate-400 mr-1">競合:</span>
                      {selectedCompany.businessModel.keyCompetitors.map((comp, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    <Code2 className="w-4 h-4" />
                    <span>Tech Stack Profile VO</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    <span className="text-slate-400 font-medium">クラウド基盤:</span>{' '}
                    <span className="font-semibold text-cyan-300">
                      {selectedCompany.techStack.cloudPlatform}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[11px] text-slate-400 mr-1">主要言語:</span>
                    {selectedCompany.techStack.primaryLanguages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-medium text-slate-200"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                  {selectedCompany.techStack.architectureHighlights.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[11px] text-slate-400 mr-1">アーキテクチャ:</span>
                      {selectedCompany.techStack.architectureHighlights.map((arch, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/20 rounded font-medium text-cyan-300"
                        >
                          {arch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tech Blogs list */}
              {selectedCompany.techStack.techBlogUrls.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>参照技術記事・登壇資料 (Tech Blog References)</span>
                  </span>
                  <div className="space-y-1">
                    {selectedCompany.techStack.techBlogUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reverse Questions Pool */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    全社逆質問カタログ・仮説プール ({selectedCompany.stockedQuestions.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenAddQuestionModal(selectedCompany.id)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>質問を追加</span>
                </button>
              </div>

              {selectedCompany.stockedQuestions.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">
                  まだ逆質問が登録されていません。「質問を追加」ボタンからストックを作成してください。
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {selectedCompany.stockedQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {q.targetRoleLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {q.categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-100 font-semibold">{q.questionText}</p>
                      <div className="p-2.5 rounded-lg bg-slate-900 text-xs text-slate-300 border border-slate-800">
                        <span className="text-amber-400 font-semibold mr-1.5">検証仮説・意図:</span>
                        {q.hypothesisOrIntent}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
