-- Run once in the Supabase SQL editor before deploying api/ratings/comment.js
alter table submissions
  add column if not exists comment text,
  add column if not exists comment_at timestamptz,
  add column if not exists comment_set_id text,
  add column if not exists comment_page_url text,
  add column if not exists comment_campaign text;
