# ADR-0007: 外部非依存の純粋 TypeScript ドメイン層、Result 型エラーハンドリング、およびドメインイベントバス

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-17

## コンテキスト (Context)
ドメインモデル、ビジネスロジック、およびアプリケーションユースケースを実装するにあたり、以下の設計方針を検討した：
- フレームワークやライブラリへの依存度（Node.js, Web API, 外部ライブラリなど）
- ドメインバリデーション失敗時や業務エラーのエラーハンドリング戦略（例外スロー vs 戻り値モナド）
- 集約間の副作用・通知の疎結合な連携手段

## 決定事項 (Decision)
1. **純粋 TypeScript によるドメイン層（Pure TypeScript Domain Layer）**:
   - `src/domain/` 配下は React、Next.js、Express、データベースドライバ等のいかなる外部ライブラリにも依存せず、Pure TypeScript のみで記述する（オニオンアーキテクチャ / ヘキサゴナルアーキテクチャの厳格な適用）。
2. **`Result<T, E>` 型による明示的エラーハンドリング**:
   - 不変条件違反や業務ルール違反において `throw new Error()` による例外送出を禁止し、`Result.ok(value)` / `Result.fail(error)` を返す。
   - 呼び出し元（アプリケーション層・UI層）で型安全に網羅的エラーハンドリングを強制する。
3. **ドメインイベントとインメモリイベントバス（Domain Events & InMemoryEventBus）**:
   - 集約ルート内で重要な状態変更が発生した際、ドメインイベント（例: `InterviewSessionScheduledEvent`, `InterviewReflectionRecordedEvent`）を発行・蓄積（`addDomainEvent`）する。
   - ユースケース完了時に `IEventBus` 経由でディスパッチし、非同期ログ記録や将来の通知システム（Slack/LINE/Google Calendar連携）との疎結合な拡張点を確保する。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **極めて高いポータビリティとテスタビリティ**: バックエンド（Node.js / Cloud Run / Lambda）、フロントエンド（React / Browser）、テストランナー（tsx / Vitest / Jest）のどこでも全く同じドメインコードが100%同一に動作する。
  - **ランタイム例外の撲滅**: 型システムにより、ドメインルール違反がどこで発生しうるかがシグネチャ上で明示される。
- **トレードオフ**:
  - `Result` のアンラップ（`isFailure` チェック）の記述が必要となり、単純な `try-catch` よりコード量が増える（ただしDDDおよびオーバーエンジニアリングの観点からは堅牢性のメリットが勝る）。
