-- Run once in the Supabase SQL editor before deploying api/surveys/submit.js
-- Shirt preference survey (slay.fashion/pages/linen-survey, /pages/linen-rich-survey).
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_key text not null,              -- 'shirt-linen' | 'shirt-linen-rich'
  answers jsonb not null,                -- { "<question>": "<chosen option>" } in question order
  comment text,
  phone text,                            -- +91XXXXXXXXXX from ?phone= link or logged-in customer
  customer_email text,
  customer_id text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_survey_responses_survey_created on survey_responses (survey_key, created_at);
create index if not exists idx_survey_responses_phone on survey_responses (phone);

-- Only the service key (used by the API) may read/write.
alter table survey_responses enable row level security;
