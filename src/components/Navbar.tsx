import React from 'react';
import {
  Briefcase,
  Calendar,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export type ActiveTab = 'pipeline' | 'companies' | 'schedule' | 'domain';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openCreateAppModal: () => void;
  openAddCompanyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openCreateAppModal,
  openAddCompanyModal,
}) => {
  const { applications, events } = useApp();

  const activeAppsCount = applications.filter((a) => !a.isTerminal).length;
  const pendingTodosCount = applications
    .flatMap((a) => a.todos)
    .filter((t) => t.statusCode === 'TODO' || t.statusCode === 'IN_PROGRESS').length;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Domain Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  Candidate DDD Platform
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full">
                  Over-Engineered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                候補者視点ドメインモデル・逆質問スナップショット・移動バッファ整合性制御
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>選考パイプライン & TODO</span>
              {pendingTodosCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-950 text-indigo-200 border border-indigo-400/40">
                  {pendingTodosCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('companies')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'companies'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>志望企業 & 逆質問プール</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>日程重複 & 移動バッファ診断</span>
            </button>

            <button
              onClick={() => setActiveTab('domain')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'domain'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>DDDモデル & イベントバス</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </nav>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={openAddCompanyModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>企業登録</span>
            </button>
            <button
              onClick={openCreateAppModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg shadow-md shadow-indigo-600/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>選考エントリー作成</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
