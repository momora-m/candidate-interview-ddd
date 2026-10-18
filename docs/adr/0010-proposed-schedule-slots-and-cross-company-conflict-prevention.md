# ADR-0010: 日程調整における候補日提示枠（Proposed Schedule Slots）の管理と複数社横断ブッキング防止方針

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-18

## コンテキスト (Context)
実際の転職活動における日程調整では、企業からの日程打診に対して候補者が複数の候補日時（第1希望〜第3希望などのスロット）を提示し、企業側がその中から1枠を確定させる非同期な調整フローが一般的である。

既存の `InterviewSession` は「日時が確定した1つのセッション」のみを表現しており、企業への返答待ちである「仮押さえ中の候補日時群」を保持・追跡できない課題があった。

候補者目線（Job Seeker Centric）において、以下のインバリアント（不変条件）を保証する必要がある：
1. **確定枠との絶対衝突防止（Hard Conflict）**: 既に他社で確定している面接（および移動・準備バッファ）と被る時間帯を、誤って別の企業への候補日として提示してはならない。
2. **他社提示中枠との重複管理（Soft Conflict / Double Booking Risk）**: 企業Aに提示している候補日枠を、同時に企業Bへも提示してしまうと、双方が同じ日時を選択した場合にダブルブッキング事故が発生する。
3. **確定時の排他解放**: 提示した複数の候補日のうち1つが企業側で確定された場合、確定した枠は正式な面接（`InterviewSession`）に昇格し、選ばれなかった他の候補日枠は速やかに解放（破棄）されなければならない。

## 決定事項 (Decision)
`JobApplication` 集約内に **`ProposedSchedule`（日程調整・候補日提示枠）** コンポーネントを導入し、複数社横断の衝突判定ドメインサービスと連携させる方針を採用した。

### 1. モデル構造
- `ProposedSchedule`（エンティティ）:
  - `id`: `ProposedScheduleId`
  - `stage`: 対象の `SelectionStage`（例: カジュアル面談、1次面接など）
  - `slots`: 提示した候補日スロット（`TimeWindow`）のリスト（1〜N件）
  - `format`: `InterviewFormat`（オンライン / 対面）
  - `status`: `ProposedScheduleStatus`（`PENDING` 返答待ち / `CONFIRMED` 確定 / `CANCELLED` 取下げ / `EXPIRED` 期限切れ）
  - `note`: 候補日提示時の特記事項メモ

### 2. 複数社横断の衝突判定（Domain Service）
`CandidateScheduleConflictDomainService` を拡張し、候補日提示時（`ProposedSchedule` 作成時）に全アクティブな `JobApplication` を検証する：
- **Hard Conflict（確定枠 × 候補枠）:【エラー / 登録禁止】**
  - 他社の確定セッション（`InterviewSession`）およびその移動・準備バッファと重複する候補枠の登録をブロックする。
- **Soft Conflict（他社提示中枠 × 候補枠）:【警告または二重提示防止】**
  - 他社へ提示中の `PENDING` な候補日枠と重複する場合、ダブルブッキングのリスクとして検知し、ドメイン警告または再調整を促す。

### 3. 日程確定のライフサイクル
- 企業側から日時の確定連絡を受けた際、`JobApplication.confirmProposedSchedule(proposedScheduleId, selectedSlotIndex)` メソッドを呼び出す。
- 選択されたスロットが `InterviewSession` として新規生成され、該当 `ProposedSchedule` は `CONFIRMED` となる。
- 未選択の候補枠は解放され、他社との重複候補枠のブロックが解除される。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - 「企業に提出中の候補日」を確実に可視化・追跡でき、面接官との日程調整における過密スケジュールやダブルブッキング事故をドメイン層で予防できる。
  - 日程確定から `InterviewSession` 生成、事前準備ToDo自動生成（`PreparationTodo`）への遷移がシームレスになる。
- **トレードオフ**:
  - 集約内の子要素が増加するため、DBスキーマ（`proposed_schedules` / `proposed_schedule_slots`）の追加および永続化処理の拡張が必要となる。
