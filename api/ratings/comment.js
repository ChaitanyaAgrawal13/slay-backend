import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, comment, setId, campaign, pageUrl } = req.body || {}

    const text = typeof comment === 'string' ? comment.trim().slice(0, 800) : ''
    if (!sessionId || !text) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // The submissions row already exists: it is created by the first rating tap.
    const { data, error } = await supabase
      .from('submissions')
      .update({
        comment: text,
        comment_at: new Date().toISOString(),
        comment_set_id: setId || null,
        comment_page_url: pageUrl || null,
        comment_campaign: campaign || null
      })
      .eq('session_id', sessionId)
      .select('id')

    if (error) throw error
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No ratings found for this session' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in comment endpoint:', error)
    res.status(500).json({ error: error.message || 'Failed to save comment' })
  }
}
