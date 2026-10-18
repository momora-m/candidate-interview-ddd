-- ADR-0012: Transactional Outbox と画面用リードモデル
-- 001_initial.sql の後に適用する。再実行できる（IF NOT EXISTS）。
-- domain_events は集約保存と同じトランザクションで追記する監査ログ。集約削除では消さない。

CREATE TABLE IF NOT EXISTS domain_events (
  position BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_on TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ,
  CONSTRAINT domain_events_aggregate_type_check CHECK (
    aggregate_type IN ('TargetCompany', 'JobApplication')
  )
);

CREATE INDEX IF NOT EXISTS idx_domain_events_undispatched
  ON domain_events (position)
  WHERE dispatched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_occurred
  ON domain_events (occurred_on DESC, position DESC);

CREATE TABLE IF NOT EXISTS read_model_companies (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS read_model_applications (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_read_model_applications_company
  ON read_model_applications (company_id, created_at);
