import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Radio,
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  Database,
  ArrowRight,
  Boxes,
  Code2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const DomainExplorerView: React.FC = () => {
  const { events, eventsLive, applications, companies } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.eventId || null);

  const selectedEvent = events.find((e) => e.eventId === selectedEventId) || events[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">DDD ドメインアーキテクチャ & イベントストリーム</h2>
        <p className="text-xs text-slate-400">
          集約境界（Aggregate Boundaries）、値オブジェクト（Value Objects）、およびインメモリイベントバスの稼働ログ
        </p>
      </div>

      {/* Aggregate Architecture Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TargetCompany Aggregate */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wide">
              Aggregate Root 1
            </span>
            <span className="text-xs text-slate-400 font-mono">CompanyId</span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <span>TargetCompany (志望企業集約)</span>
          </h3>
          <p className="text-xs text-slate-300">
            全社的な企業インテリジェンスと、複数選考で再利用可能な逆質問マスターを管理する独立集約。
          </p>

          <div className="space-y-2 pt-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-indigo-300">BusinessModel (VO)</span>
              <p className="text-[11px] text-slate-400">
                事業概要・B2B/B2C顧客層・収益構造・競合企業リストの不変セット
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-cyan-300">TechStackProfile (VO)</span>
              <p className="text-[11px] text-slate-400">
                主要言語・GCP/AWSクラウド基盤・アーキテクチャ特徴・参照技術記事URL
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-amber-300">StockedReverseQuestion[] (VO List)</span>
              <p className="text-[11px] text-slate-400">
                面接官ロール（Lead/EM/CTO/HR）と検証仮説（Intent）が紐づいた質問カタログ
              </p>
            </div>
          </div>
        </div>

        {/* JobApplication Aggregate */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
              Aggregate Root 2 (Transaction Boundary)
            </span>
            <span className="text-xs text-slate-400 font-mono">ApplicationId</span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            <span>JobApplication (選考応募集約)</span>
          </h3>
          <p className="text-xs text-slate-300">
            ポジション固有の志望動機、選考パイプライン、面接日程、および事前準備TODOのライフサイクルを統合管理。
          </p>

          <div className="space-y-2 pt-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-emerald-300">PositionMotivation & SalaryRange (VO)</span>
              <p className="text-[11px] text-slate-400">
                なぜこのポジションか・提供価値・キャリア整合性・希望年収範囲
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-indigo-300">InterviewSession (Internal Entity)</span>
              <p className="text-[11px] text-slate-400">
                TimeWindow（移動バッファ込）・InterviewFormat・AssignedReverseQuestion（スナップショットコピー）・InterviewReflection
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-amber-300">PreparationTodo (Internal Entity)</span>
              <p className="text-[11px] text-slate-400">
                面接日程確定に伴う事前リサーチ・逆質問準備・本番・振り返りタスクの自動導出
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Domain Event Bus Log */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-3 h-3 rounded-full ${eventsLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>リアルタイム・ドメインイベントバス (Domain Event Bus Log: {events.length} events)</span>
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
            {eventsLive ? 'SSE 接続中' : 'SSE 再接続中'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          {/* Event Stream List */}
          <div className="lg:col-span-6 space-y-2 max-h-96 overflow-y-auto pr-1">
            {events.map((evt) => {
              const isSelected = selectedEvent?.eventId === evt.eventId;

              return (
                <div
                  key={evt.eventId}
                  onClick={() => setSelectedEventId(evt.eventId)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-emerald-300">
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.occurredOn).toLocaleTimeString('ja-JP')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                    Aggregate: {evt.aggregateId}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Event Payload Viewer */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-bold text-slate-300 font-mono">Event Payload Viewer</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedEvent?.eventId}
              </span>
            </div>
            {selectedEvent ? (
              <pre className="text-[11px] font-mono text-indigo-300 overflow-x-auto p-2 bg-slate-900/60 rounded-lg max-h-80">
                {JSON.stringify(
                  {
                    eventId: selectedEvent.eventId,
                    eventType: selectedEvent.eventType,
                    aggregateId: selectedEvent.aggregateId,
                    occurredOn: selectedEvent.occurredOn,
                    payload: selectedEvent.payload,
                  },
                  null,
                  2
                )}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 italic p-4 text-center">
                イベントを選択してください
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
