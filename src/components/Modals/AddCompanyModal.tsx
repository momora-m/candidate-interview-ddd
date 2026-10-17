import React, { useState } from 'react';
import { X, Building2, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TargetAudience } from '@/domain/company/BusinessModel';
import { CloudPlatformType } from '@/domain/company/TechStackProfile';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose }) => {
  const { createTargetCompany } = useApp();

  const [name, setName] = useState('');
  const [productSummary, setProductSummary] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('B2B_ENTERPRISE');
  const [revenueStream, setRevenueStream] = useState('SaaSサブスクリプション');
  const [competitors, setCompetitors] = useState('');
  const [languages, setLanguages] = useState('TypeScript, Go');
  const [cloudPlatform, setCloudPlatform] = useState<CloudPlatformType>('GCP');
  const [architecture, setArchitecture] = useState('Cloud Run, DDD, PostgreSQL');
  const [techBlogs, setTechBlogs] = useState('');
  const [attractiveness, setAttractiveness] = useState('');
  const [mission, setMission] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await createTargetCompany({
        name,
        productSummary,
        targetAudience,
        revenueStream,
        keyCompetitors: competitors.split(',').map((s) => s.trim()).filter(Boolean),
        primaryLanguages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        cloudPlatform,
        architectureHighlights: architecture.split(',').map((s) => s.trim()).filter(Boolean),
        techBlogUrls: techBlogs.split('\n').map((s) => s.trim()).filter(Boolean),
        overallAttractivenessSummary: attractiveness || undefined,
        corporateMission: mission || undefined,
      });

      if (res.success) {
        onClose();
        setName('');
        setProductSummary('');
      } else {
        setError(res.error || '企業の登録に失敗しました。');
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
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">志望企業プロファイルの登録</h2>
              <p className="text-xs text-slate-400">ビジネスモデル・技術スタック・企業魅力を集約化します</p>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">企業名 (必須)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 株式会社テックイノベーション"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              事業概要・プロダクト (必須)
            </label>
            <textarea
              rows={2}
              value={productSummary}
              onChange={(e) => setProductSummary(e.target.value)}
              placeholder="エンジニア向け開発生産性向上SaaS"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">顧客ターゲット</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="B2B_ENTERPRISE">B2B エンタープライズ</option>
                <option value="B2B_SMB">B2B 中小企業向け</option>
                <option value="B2C">B2C 一般消費者向け</option>
                <option value="C2C">C2C プラットフォーム</option>
                <option value="INTERNAL_PLATFORM">社内共通基盤</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">クラウド基盤</label>
              <select
                value={cloudPlatform}
                onChange={(e) => setCloudPlatform(e.target.value as CloudPlatformType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="GCP">Google Cloud (GCP)</option>
                <option value="AWS">Amazon Web Services (AWS)</option>
                <option value="AZURE">Microsoft Azure</option>
                <option value="HYBRID">マルチクラウド / ハイブリッド</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                主要言語 (カンマ区切り)
              </label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="TypeScript, Go, Rust"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                収益モデル (Revenue Stream)
              </label>
              <input
                type="text"
                value={revenueStream}
                onChange={(e) => setRevenueStream(e.target.value)}
                placeholder="月額サブスクリプション + API利用量課金"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              アーキテクチャ特徴 (カンマ区切り)
            </label>
            <input
              type="text"
              value={architecture}
              onChange={(e) => setArchitecture(e.target.value)}
              placeholder="Cloud Run, Clean Architecture / DDD, Event-Driven Pub/Sub"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              技術ブログ / 登壇スライドURL (改行区切り)
            </label>
            <textarea
              rows={2}
              value={techBlogs}
              onChange={(e) => setTechBlogs(e.target.value)}
              placeholder="https://tech.example.com/posts/architecture-refactor"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              惹かれたポイント・魅力の要約
            </label>
            <textarea
              rows={2}
              value={attractiveness}
              onChange={(e) => setAttractiveness(e.target.value)}
              placeholder="レガシー刷新とDDD推進フェーズにあり、スタッフエンジニアとして技術選定の裁量が大きい"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
              <span>{submitting ? '登録中...' : '企業集約を登録'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
