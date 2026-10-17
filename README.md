# Candidate DDD Platform (面接日程・選考ナレッジ管理プラットフォーム)

> 転職・就職活動において、候補者（応募者自身）が複数企業の選考プロセス、面接日程、逆質問スナップショット、および事前・事後タスク（TODO）を管理するための**過剰設計（Over-Engineered）なドメイン駆動設計（DDD）アプリケーション**です。

---

## 1. ドメインアーキテクチャ概要 (Architecture & Layers)

本リポジトリは、UIフレームワークや永続化層（Google Cloud / RDB）からドメインロジックを完全に分離したオニオンアーキテクチャ（ヘキサゴナルアーキテクチャ）を採用しています。

```
[ Domain Layer (Pure TypeScript / No External Dependencies) ]
    ├── Shared Kernel (Result Monad, ValueObject, Entity, AggregateRoot, DomainEvent)
    ├── TargetCompany Aggregate (CompanyId, BusinessModel VO, TechStackProfile VO, StockedReverseQuestion VO)
    ├── JobApplication Aggregate (ApplicationId, PositionDetails VO, PositionMotivation VO, SelectionStage VO)
    │     ├── InterviewSession (Internal Entity: TimeWindow VO, InterviewFormat VO, AssignedReverseQuestion VO, InterviewReflection VO)
    │     └── PreparationTodo (Internal Entity: TaskType VO, TaskStatus VO, TaskPriority VO)
    ├── Domain Services (CandidateScheduleConflictDomainService with Travel Buffers)
    └── Repositories / Ports (ITargetCompanyRepository, IJobApplicationRepository)

[ Application Layer ]
    ├── Use Cases (ScheduleInterview, RecordReflection, AssignQuestion, AdvanceStage, etc.)
    ├── Event Bus Port & In-Memory Dispatcher (IEventBus / InMemoryEventBus)
    └── DTOs & Mappers

[ Presentation Layer ]
    └── React 19 + Vite 6 + Tailwind CSS SPA
```

---

## 2. ユビキタス言語と値オブジェクト（Value Objects）の設計

| 概念 | 分類 | 責務・不変条件（Invariants） |
| :--- | :--- | :--- |
| **`TargetCompany`** | 集約ルート | 志望企業の基本情報、事業モデル、技術スタック、および全社逆質問プールを管理する独立集約。 |
| **`JobApplication`** | 集約ルート | ポジション固有の志望動機、選考パイプライン、面接日程、および事前準備TODOのトランザクション境界。 |
| **`TimeWindow`** | 値オブジェクト | 開始時刻 < 終了時刻（15分〜360分）の保証。他社面接との直接重複判定、および移動・準備バッファを考慮した過密判定アルゴリズムをカプセル化。 |
| **`InterviewFormat`** | 値オブジェクト | オンライン（`MeetingUrl`）と対面（オフィス・会議室・片道移動見込時間）の判別共用体。形式に応じた必要移動バッファ（10分 vs 45分等）を提供。 |
| **`StockedReverseQuestion`** | 値オブジェクト | 企業マスターにストックされる「逆質問の型」。対象面接官（現場/EM/役員/人事）と検証仮説（Intent）を持つ。 |
| **`AssignedReverseQuestion`** | 値オブジェクト | **マスターから面接セッションにディープコピーされた不変スナップショット**。面接文脈に応じた文面カスタマイズ、得られた回答メモ、納得度スコア（1〜5）を保持。 |
| **`InterviewReflection`** | 値オブジェクト | 面接直後に記録する自己パフォーマンス評価、企業印象スコア、得られた知見、懸念点、次回アクションの不変セット。 |
| **`SelectionStage`** | 値オブジェクト | 書類選考、一次、二次、最終、オファー等の有限状態遷移ルール。面接振り返りが未入力の場合は次ステージへの昇格を拒否。 |

---

## 3. 主な機能とドメインの振る舞い

1. **面接確定時のタスク自動導出（Auto-Generated Preparation Flow）**:
   - 面接日程が確定すると、選考フェーズに応じた「企業リサーチ」「逆質問選定」「面接本番」「振り返り記録」「お礼送付」タスクが自動生成されます。
2. **逆質問のイミュータブル・スナップショット（Immutable Question Copy）**:
   - 企業マスターの逆質問を変更・削除しても、過去の面接で質問した文脈・回答履歴が破壊されません。
3. **移動時間・準備バッファを考慮したスケジュール衝突検知（Travel Buffer Collision Detection）**:
   - 単なる時間の重なりだけでなく、「対面面接の移動45分」を考慮した物理的に移動不可能な過密スケジュールをリアルタイムに検知・警告します。
4. **イベント駆動アーキテクチャ（Domain Event Bus）**:
   - すべての集約状態変更（面接予約、逆質問アサイン、振り返り記録、ステージ昇格）はドメインイベントを発行し、イベントストリームでリアルタイムに追跡できます。

---

## 4. ローカル起動とテスト実行方法

### 依存関係のインストール
```bash
npm install
```

### 単体テストの実行 (tsx test runner)
```bash
npm test
```

### 開発サーバーの起動 (Vite)
```bash
npm run dev
```
ブラウザで `http://localhost:3847` を開くと、DDDプラットフォームのUIが表示されます。

### プロダクションビルド
```bash
npm run build
```
