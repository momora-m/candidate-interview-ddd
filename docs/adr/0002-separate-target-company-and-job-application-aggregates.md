# ADR-0002: 志望企業（TargetCompany）と選考応募（JobApplication）の集約境界分離

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-17

## コンテキスト (Context)
企業情報（事業モデル、技術スタック、技術ブログ、全社的な逆質問プール）と、選考プロセス（応募職種、志望動機、面接日程、TODOタスク）を単一の集約にするか、独立した2つの集約に分離するかを検討した。

## 決定事項 (Decision)
`TargetCompany` と `JobApplication` を**独立した2つの集約ルート（Aggregate Roots）**として分離し、`JobApplication` は `CompanyId`（値オブジェクト）による一方向の疎結合な参照のみを保持する設計とした。

```
[ TargetCompany (集約ルート) ]
  ├── CompanyProfile (BusinessModel, TechStackProfile)
  └── StockedReverseQuestion[] (全社逆質問プール)

           ▲ (CompanyId による参照のみ)
           │
[ JobApplication (集約ルート) ]
  ├── PositionDetails / PositionMotivation
  ├── SelectionPipeline / SelectionStage
  ├── InterviewSession[] (内部エンティティ)
  └── PreparationTodo[] (内部エンティティ)
```

## 影響とトレードオフ (Consequences)
- **メリット**:
  - **再利用性と履歴保持**: 1つの企業に対して複数ポジションに応募する場合や、過去に選考を受けた企業のナレッジ・技術情報を蓄積したまま別の機会に再応募するケースに対応できる。
  - **トランザクション境界の最小化**: 日常的に頻繁に更新される面接日程やTODOの変更が、全社的な企業ナレッジ集約のロックやトランザクションに波及しない。
- **トレードオフ**:
  - 企業名などの表示用データを取得する際、アプリケーション層で両集約を読み出してマッピングする（Join / DTO合成）責務が発生する。
