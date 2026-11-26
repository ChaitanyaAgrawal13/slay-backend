-- Run once in the Supabase SQL editor BEFORE deploying the progressive-save version
-- of api/surveys/submit.js. Lets each visitor's row be updated after every answer.
alter table survey_responses
  add column if not exists session_id text,
  add column if not exists completed boolean not null default false,
  add column if not exists question_order jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists survey_responses_session_id_key on survey_responses (session_id);
