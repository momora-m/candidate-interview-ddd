# ADR-0012: 単一コンテナ完結型 In-Process CQRS、Transactional Outbox、および SSE リアルタイム同期方針

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-18

## コンテキスト (Context)
本システムでは、ドメイン駆動設計（DDD）のドメインイベント（`CandidateDomainEvents`）を中心としたイベント駆動アーキテクチャおよび CQRS（コマンド・クエリ責務分離）の導入を目指している。

一般に CQRS / イベント駆動をクラウド上で実現する場合、Google Cloud Pub/Sub や Memorystore (Redis)、複数のマイクロサービスコンテナを組み合わせる構成が採られるが、以下の課題・トレードオフが存在する：
- 単一ユーザー向けアプリケーションに対して分散インフラを導入すると、月額コストが跳ね上がる（$50〜$120/月）。
- 分散システム特有のネットワーク遅延、メッセージ重複排除（Idempotency）、二重書き込み不整合（Dual Write Problem）の対策コストが過大になる。

一方で、**「書き込み時の厳格な不変条件保護」「過去の全イベント履歴の確実な蓄積（監査・分析）」「画面描画に最適化された高速リードモデル」「イベント発生時のリアルタイム画面更新」** という CQRS / イベント駆動の本質的な恩恵は、個人向けアプリであっても極めて高い価値を持つ。

## 決定事項 (Decision)
外部分散キュー（Pub/Sub や Redis）を排し、**「単一コンテナ + 単一 PostgreSQL」の境界内で完結する In-Process CQRS、Transactional Outbox、および Server-Sent Events (SSE) リアルタイム同期** を採用した。

### 1. コマンド側: Transactional Outbox による集約とイベントの不可分永続化
- 集約（`JobApplication` / `TargetCompany`）の保存時、同一 PostgreSQL トランザクション内で発行されたドメインイベントを `domain_events` テーブルにバルク挿入する。
- **Dual Write 問題の解消**: データベーストランザクションの ACID 特性により、「集約の状態変更」と「イベントの記録」が完全にアトミック（不可分）に保証される。

```text
[ Command Execution ]
   │
   ▼ Transaction BEGIN
   ├── 集約テーブル UPSERT / 子テーブル再挿入 (Write Model)
   └── domain_events テーブル INSERT (Outbox / Event Log)
   ▲ Transaction COMMIT
```

### 2. プロセス内イベントバス（In-Memory Event Bus）によるゼロ遅延ディスパッチ
- トランザクションコミット後、集約が保持していたイベントを `InMemoryEventBus` に publish する。
- 外部ネットワーク通信を経由しないため、配信遅延 0ms で各イベントハンドラーへディスパッチされる。

### 3. クエリ側: 最適化リードモデル（Read Model Projections）
- **プロジェクション（Projection）**:
  - イベント購読ハンドラーが、画面（選考パイプライン、統合カレンダー、企業情報）に必要な構造へ事前加工した「リードモデル（非正規化テーブルまたはインメモリキャッシュ）」を即座に更新する。
- **高速クエリ**:
  - `CandidateQueryService` は集約をロード（再構築）することなく、リードモデルから単一 SELECT で DTO を返却する。

### 4. Server-Sent Events (SSE) によるリアルタイム UI 自動同期
- Hono サーバーに `GET /api/events/stream` エンドポイントを設け、ブラウザと HTTP SSE ストリームを維持。
- イベントバスにドメインイベントが流れた瞬間、接続中のフロントエンドへ JSON メッセージをプッシュ送信。
- フロントエンド（React）はポーリングを行わず、SSE 受信をトリガーに画面をリアクティブに最新化する。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **インフラ追加コスト $0**: Cloud Run 1 コンテナと最小 Cloud SQL のままで、完全な CQRS・イベント駆動・リアルタイムプッシュが動作する。
  - **ローカル・本番完全パリティ**: 特別なクラウドエミュレータを必要とせず、ローカル（Node.js / PGlite）および CI 上で全く同じイベントフローとテストが高速に完結する。
  - **将来のスケールアウトへの拡張性**: 将来的に Pub/Sub や BigQuery へイベントを転送したくなった場合も、`IEventBus` または Outbox ポーラーを差し替えるだけで容易に分散構成へ移行可能。
- **トレードオフ**:
  - コンテナを水平スケール（2台以上）した場合、インメモリイベントバスの通知が他コンテナの SSE クライアントへ届かない制約が生じる（現フェーズは `max-instances: 1` の個人用構成であるため問題なし。複数台化時は PostgreSQL `LISTEN/NOTIFY` または Pub/Sub への切り替えで対処可能）。
