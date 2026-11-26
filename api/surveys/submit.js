import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Storefront preference survey (theme: sections/shirt-preference-survey.liquid).
// Anonymous by design, so inputs are whitelisted by shape/size.
const SURVEY_KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const MAX_ANSWERS = 30
const MAX_TEXT = 300
const MAX_COMMENT = 2000
const SESSION_RE = /^[A-Za-z0-9-]{8,64}$/

const str = (v, max) => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = req.body || {}
    const surveyKey = str(body.survey_key, 64)
    if (!surveyKey || !SURVEY_KEY_RE.test(surveyKey)) {
      return res.status(400).json({ error: 'invalid_survey' })
    }

    const raw = body.answers
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return res.status(400).json({ error: 'invalid_answers' })
    }
    const answers = {}
    for (const [q, a] of Object.entries(raw).slice(0, MAX_ANSWERS)) {
      const question = str(q, MAX_TEXT)
      const answer = str(a, MAX_TEXT)
      if (question && answer) answers[question] = answer
    }
    const comment = str(body.comment, MAX_COMMENT)
    if (Object.keys(answers).length === 0 && !comment) {
      return res.status(400).json({ error: 'invalid_answers' })
    }

    const digits = (str(body.phone, 20) || '').replace(/\D/g, '')
    const phone = digits.length >= 10 ? `+91${digits.slice(-10)}` : null

    const row = {
      survey_key: surveyKey,
      answers,
      comment,
      phone,
      customer_email: str(body.customer_email, 254),
      customer_id: str(body.customer_id, 32),
      page_url: str(body.page_url, 500),
      user_agent: str(req.headers['user-agent'], 300)
    }
    if (Array.isArray(body.question_order)) {
      row.question_order = body.question_order.slice(0, MAX_ANSWERS).map((q) => str(q, MAX_TEXT)).filter(Boolean)
    }
    // Only ever flip completed to true — a later partial save must not undo it.
    if (body.completed === true) row.completed = true

    const sessionId = str(body.session_id, 64)
    let query
    if (sessionId && SESSION_RE.test(sessionId)) {
      // Progressive save: one row per visitor, updated after every answer.
      row.session_id = sessionId
      row.updated_at = new Date().toISOString()
      query = supabase.from('survey_responses').upsert(row, { onConflict: 'session_id' })
    } else {
      query = supabase.from('survey_responses').insert(row)
    }
    const { data, error } = await query.select('id').single()

    if (error) throw error
    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    console.error('[surveys/submit]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
