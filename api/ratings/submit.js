import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { ratings, sessionId, metadata, campaign: bodyCampaign } = req.body

    if (!ratings || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Campaign tag — accepts ?c=A, ?c=B, ?c=anything (or null if not sent)
    const campaign = bodyCampaign || metadata?.campaign || null

    // Upsert individual ratings (update if same session+product, insert if new)
    const ratingRecords = Object.entries(ratings).map(([productId, rating]) => ({
      product_id: productId,
      rating: parseInt(rating),
      session_id: sessionId,
      product_title: metadata?.productTitles?.[productId] || null,
      metadata: {
        userAgent: req.headers['user-agent'],
        pageUrl: metadata?.pageUrl,
        timestamp: new Date().toISOString(),
        campaign
      }
    }))

    const { data: ratingsData, error: ratingsError } = await supabase
      .from('product_ratings')
      .upsert(ratingRecords, {
        onConflict: 'session_id,product_id'
      })
      .select()

    if (ratingsError) {
      console.error('Error upserting ratings:', ratingsError)
      throw ratingsError
    }

    // Upsert submission record (update if exists, insert if new)
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .upsert({
        session_id: sessionId,
        total_products_rated: Object.keys(ratings).length,
        ratings: ratings
      }, {
        onConflict: 'session_id'
      })
      .select()

    if (submissionError) {
      console.error('Error upserting submission:', submissionError)
      throw submissionError
    }

    res.status(200).json({
      success: true,
      ratingsCount: ratingsData.length,
      submissionId: submissionData[0].id
    })
  } catch (error) {
    console.error('Error in submit endpoint:', error)
    res.status(500).json({
      error: error.message || 'Failed to submit ratings',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}
