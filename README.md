# slay-backend

Vercel-deployed serverless API for slay.fashion. Hooked into Supabase.

## Endpoints

- `POST /api/ratings/submit` — design feedback submission (upserts into `product_ratings` + `submissions`). Reads optional `campaign` from request body (top-level or `metadata.campaign`) and stores it in `product_ratings.metadata.campaign` for A/B link attribution.
- `POST /api/upload/photo` — virtual try-on customer photo upload (Supabase Storage + `customer_uploads` table).

## Environment variables (set in Vercel project settings)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Deploy

Connected to Vercel project `shopify-store`. Pushes to `main` auto-deploy.
