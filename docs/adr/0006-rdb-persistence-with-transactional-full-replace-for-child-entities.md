# ADR-0006: RDB（PostgreSQL）永続化と子エンティティのトランザクション内全削除・一括再挿入方針

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-17

## コンテキスト (Context)
本システムは Google Cloud（Cloud SQL / PostgreSQL 等）上での運用を想定している。
DDDにおける集約（Aggregate Root）内の子エンティティ（`InterviewSession` や `PreparationTodo`）の永続化において、差分更新（Diffing: 各行の変更・追加・削除の追跡）をORM等で行うか、集約単位の完全置換を行うかを検討した。

## 決定事項 (Decision)
**RDB（PostgreSQL）を前提とし、集約保存時は単一トランザクション内で「子エンティティ・値オブジェクトテーブルの全削除＆一括再挿入（Wipe & Bulk Insert / Last-Write-Wins）」方式を採用する。**

```sql
-- JobApplication 集約保存時の擬似処理（単一DBトランザクション内）
BEGIN;
  -- 1. 集約ルートテーブルの UPSERT
  INSERT INTO job_applications (id, company_id, status, stage, motivation, updated_at)
  VALUES ($1, $2, $3, $4, $5, NOW())
  ON CONFLICT (id) DO UPDATE SET ...;

  -- 2. 内部子エンティティの全削除（該当 application_id 分）
  DELETE FROM interview_sessions WHERE application_id = $1;
  DELETE FROM preparation_todos WHERE application_id = $1;

  -- 3. メモリ上の現在の集約内リストを一括再挿入
  INSERT INTO interview_sessions (id, application_id, ...) VALUES (...);
  INSERT INTO preparation_todos (id, application_id, ...) VALUES (...);
COMMIT;
```

## 根拠 (Rationale)
1. **候補者単一アクター性**: 候補者個人向けアプリであり、同一の応募データに対して複数人が分散・並行して同時書き込み（Concurrent Write Conflict）を行うドメインではない。
2. **集約の整合性（Invariants）の担保**: 集約ルートが常に子エンティティ全体の完全な正当性（不変条件）を保証しているため、メモリ上の集約状態をそのまま永続化層へ丸ごとダンプする方が、差分更新バグ（削除漏れ、孤立レコード発生、外部キー不整合）を完全に排除できる。
3. **ORM依存の排除**: 複雑なORMのリレーション追跡機能に依存せず、シンプルなSQLクエリや軽量クエリビルダーで安全に集約リポジトリを実装できる。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - 実装が極めてシンプルかつ堅牢で、ORMのライフサイクルフックやLazy Loadingによる「N+1問題」「Dirty Checkingの予期せぬ動作」から完全に解放される。
  - 集約の設計（値オブジェクトの不変性、集約ルートによる保護）とリポジトリの責務が直結する。
- **トレードオフ**:
  - 1つの応募に対する面接回数やTODO件数は数十件程度と小さいためパフォーマンス上のオーバーヘッドは無視できるが、数万件規模のコレクションを持つ集約には適用できない（本ドメインの性質上、そのような大規模データは発生しない）。
