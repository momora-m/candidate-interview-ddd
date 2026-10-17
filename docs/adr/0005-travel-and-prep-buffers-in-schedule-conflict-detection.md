# ADR-0005: 移動・準備バッファ（Travel Buffer）を考慮した日程重複・過密判定アルゴリズム

- **ステータス**: 承認 (Accepted)
- **決定日**: 2026-10-17

## コンテキスト (Context)
候補者にとっての面接日程の衝突（Conflict）は、単に「面接の開始〜終了時刻が被っているか（物理的重複）」だけではない。
以下のような実生活上の過密スケジュールが、面接パフォーマンスの低下や遅刻の原因となる：
- 対面面接の直前・直後に他社面接があり、物理的な移動時間（Travel Buffer）が足りない。
- オンライン面接であっても、事前準備（カメラ・マイク確認、企業資料の読み返し）や面接直後の振り返り入力の時間が確保できない。

## 決定事項 (Decision)
`TimeWindow` 値オブジェクトおよび `CandidateScheduleConflictDomainService`（ドメインサービス）を導入し、**開催形式（InterviewFormat）に応じた移動バッファおよび準備バッファを含む拡張時間枠（Extended TimeWindow）での衝突判定アルゴリズム** を実装した。

- `InterviewFormat`: Discriminated Union 値オブジェクト（`online` vs `in_person`）
  - `online`: 準備バッファ（デフォルト15分）
  - `in_person`: 会場住所（`InterviewLocation`）および移動バッファ（デフォルト前後45分）
- `TimeWindow.overlapsWithBuffers(other, myBuffers, otherBuffers)`:
  - 自身および比較対象の前後バッファを合算・拡張した時間区間を計算し、重複（衝突）を検知。
- `CandidateScheduleConflictDomainService`:
  - 応募中（アクティブ）の全選考（全 `JobApplication`）を横断し、新規面接候補日時が既存の確定面接およびそのバッファと衝突しないかを検証する。

## 影響とトレードオフ (Consequences)
- **メリット**:
  - 対面面接とオンライン面接が混在する転職活動において、現実的に移動不可能なスケジュール設定をドメインルールとして確実にブロックまたは警告できる。
  - バッファ計算ロジックがドメイン層でカプセル化され、UIや外部APIに依存しない純粋な計算テストが可能。
- **トレードオフ**:
  - 移動時間の自動計算（Google Maps API 等による実ルート検索）はドメイン外の関心事とし、初期実装では形式ごとの固定バッファ値（または手動指定）としている。
