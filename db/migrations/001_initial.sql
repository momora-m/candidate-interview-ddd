-- Candidate Interview DDD 初期スキーマ
-- ADR-0006: 集約保存時、子テーブルは同一トランザクションで全削除してから再挿入する。
-- このスクリプトは空のデータベースに対して再実行できる（IF NOT EXISTS）。
-- 既存テーブルの列変更は行わない。

CREATE TABLE IF NOT EXISTS target_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_summary TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  revenue_stream TEXT NOT NULL,
  key_competitors TEXT[] NOT NULL DEFAULT '{}',
  primary_languages TEXT[] NOT NULL DEFAULT '{}',
  cloud_platform TEXT NOT NULL,
  architecture_highlights TEXT[] NOT NULL DEFAULT '{}',
  tech_blog_urls TEXT[] NOT NULL DEFAULT '{}',
  overall_attractiveness_summary TEXT,
  corporate_mission TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT target_companies_name_check CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT target_companies_audience_check CHECK (
    target_audience IN ('B2B_ENTERPRISE', 'B2B_SMB', 'B2C', 'C2C', 'INTERNAL_PLATFORM')
  ),
  CONSTRAINT target_companies_cloud_check CHECK (
    cloud_platform IN ('GCP', 'AWS', 'AZURE', 'HYBRID', 'OTHER')
  )
);

CREATE TABLE IF NOT EXISTS stocked_reverse_questions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES target_companies (id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  target_role TEXT NOT NULL,
  question_text TEXT NOT NULL,
  hypothesis_or_intent TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  CONSTRAINT stocked_reverse_questions_category_check CHECK (
    category IN ('CULTURE', 'TECH_STACK', 'ROADMAP', 'EVALUATION', 'ORGANIZATION')
  ),
  CONSTRAINT stocked_reverse_questions_role_check CHECK (
    target_role IN (
      'LEAD_ENGINEER',
      'ENGINEERING_MANAGER',
      'EXECUTIVE_CTO',
      'TALENT_ACQUISITION'
    )
  ),
  CONSTRAINT stocked_reverse_questions_sort_check CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stocked_reverse_questions_company
  ON stocked_reverse_questions (company_id, sort_order);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES target_companies (id) ON DELETE RESTRICT,
  position_title TEXT NOT NULL,
  job_description_url TEXT,
  salary_min_amount INTEGER,
  salary_max_amount INTEGER,
  salary_currency TEXT NOT NULL DEFAULT 'JPY',
  target_seniority TEXT,
  desirability_rating SMALLINT NOT NULL,
  why_this_role TEXT NOT NULL DEFAULT '',
  value_proposition TEXT NOT NULL DEFAULT '',
  career_growth_alignment TEXT NOT NULL DEFAULT '',
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT job_applications_title_check CHECK (char_length(btrim(position_title)) > 0),
  CONSTRAINT job_applications_desirability_check CHECK (desirability_rating BETWEEN 1 AND 5),
  CONSTRAINT job_applications_currency_check CHECK (char_length(salary_currency) BETWEEN 3 AND 8),
  CONSTRAINT job_applications_salary_check CHECK (
    (salary_min_amount IS NULL OR salary_min_amount >= 0)
    AND (salary_max_amount IS NULL OR salary_max_amount >= 0)
    AND (
      salary_min_amount IS NULL
      OR salary_max_amount IS NULL
      OR salary_min_amount <= salary_max_amount
    )
  ),
  CONSTRAINT job_applications_stage_check CHECK (
    current_stage IN (
      'DOCUMENT_SCREENING',
      'CASUAL_INTERVIEW',
      'FIRST_TECHNICAL',
      'SECOND_MANAGEMENT',
      'FINAL_EXECUTIVE',
      'OFFER_NEGOTIATION',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  ),
  CONSTRAINT job_applications_status_check CHECK (
    status IN ('IN_PROGRESS', 'OFFER_ACCEPTED', 'REJECTED', 'WITHDRAWN')
  ),
  CONSTRAINT job_applications_version_check CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_company
  ON job_applications (company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_job_applications_status
  ON job_applications (status);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES job_applications (id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  format_type TEXT NOT NULL,
  meeting_url TEXT,
  meeting_platform TEXT,
  meeting_passcode TEXT,
  meeting_notes TEXT,
  location_name TEXT,
  room_name TEXT,
  reception_instructions TEXT,
  estimated_travel_minutes INTEGER,
  interviewer_names TEXT[] NOT NULL DEFAULT '{}',
  is_completed BOOLEAN NOT NULL,
  reflection_candidate_performance_rating SMALLINT,
  reflection_company_impression_rating SMALLINT,
  reflection_key_learnings TEXT,
  reflection_concerns TEXT,
  reflection_next_actions TEXT,
  reflection_recorded_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT interview_sessions_stage_check CHECK (
    stage_code IN (
      'DOCUMENT_SCREENING',
      'CASUAL_INTERVIEW',
      'FIRST_TECHNICAL',
      'SECOND_MANAGEMENT',
      'FINAL_EXECUTIVE',
      'OFFER_NEGOTIATION',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  ),
  CONSTRAINT interview_sessions_window_check CHECK (ends_at > starts_at),
  CONSTRAINT interview_sessions_sort_check CHECK (sort_order >= 0),
  CONSTRAINT interview_sessions_platform_check CHECK (
    meeting_platform IS NULL
    OR meeting_platform IN ('ZOOM', 'GOOGLE_MEET', 'TEAMS', 'OTHER')
  ),
  CONSTRAINT interview_sessions_format_shape CHECK (
    (
      format_type = 'ONLINE'
      AND meeting_url IS NOT NULL
      AND location_name IS NULL
      AND room_name IS NULL
      AND reception_instructions IS NULL
      AND estimated_travel_minutes IS NULL
    )
    OR (
      format_type = 'IN_PERSON'
      AND meeting_url IS NULL
      AND meeting_platform IS NULL
      AND meeting_passcode IS NULL
      AND meeting_notes IS NULL
      AND location_name IS NOT NULL
      AND room_name IS NOT NULL
      AND reception_instructions IS NOT NULL
      AND estimated_travel_minutes IS NOT NULL
      AND estimated_travel_minutes >= 0
    )
  ),
  CONSTRAINT interview_sessions_reflection_shape CHECK (
    (
      reflection_candidate_performance_rating IS NULL
      AND reflection_company_impression_rating IS NULL
      AND reflection_key_learnings IS NULL
      AND reflection_concerns IS NULL
      AND reflection_next_actions IS NULL
      AND reflection_recorded_at IS NULL
    )
    OR (
      reflection_candidate_performance_rating BETWEEN 1 AND 5
      AND reflection_company_impression_rating BETWEEN 1 AND 5
      AND reflection_key_learnings IS NOT NULL
      AND reflection_next_actions IS NOT NULL
      AND reflection_recorded_at IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_application
  ON interview_sessions (application_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_starts_at
  ON interview_sessions (starts_at);

CREATE TABLE IF NOT EXISTS assigned_reverse_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions (id) ON DELETE CASCADE,
  source_question_id TEXT,
  category TEXT NOT NULL,
  customized_question_text TEXT NOT NULL,
  is_asked BOOLEAN NOT NULL,
  obtained_answer TEXT,
  insight_rating SMALLINT,
  sort_order INTEGER NOT NULL,
  CONSTRAINT assigned_reverse_questions_category_check CHECK (
    category IN ('CULTURE', 'TECH_STACK', 'ROADMAP', 'EVALUATION', 'ORGANIZATION')
  ),
  CONSTRAINT assigned_reverse_questions_rating_check CHECK (
    insight_rating IS NULL OR insight_rating BETWEEN 1 AND 5
  ),
  CONSTRAINT assigned_reverse_questions_sort_check CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_assigned_reverse_questions_session
  ON assigned_reverse_questions (session_id, sort_order);

CREATE TABLE IF NOT EXISTS preparation_todos (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES job_applications (id) ON DELETE CASCADE,
  interview_session_id TEXT REFERENCES interview_sessions (id) ON DELETE RESTRICT,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL,
  CONSTRAINT preparation_todos_type_check CHECK (
    task_type IN (
      'PRE_INTERVIEW_RESEARCH',
      'REVERSE_QUESTION_PREP',
      'RESUME_PORTFOLIO_REVIEW',
      'ATTEND_INTERVIEW',
      'POST_INTERVIEW_REFLECTION',
      'THANK_YOU_NOTE',
      'CUSTOM_TODO'
    )
  ),
  CONSTRAINT preparation_todos_status_check CHECK (
    status IN ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED')
  ),
  CONSTRAINT preparation_todos_priority_check CHECK (
    priority IN ('URGENT', 'HIGH', 'MEDIUM', 'LOW')
  ),
  CONSTRAINT preparation_todos_sort_check CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_preparation_todos_application
  ON preparation_todos (application_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_preparation_todos_session
  ON preparation_todos (interview_session_id);
