import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

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
    const { order_id, photo, fileName, contentType, sessionId, metadata } = req.body

    if (!photo || !order_id) {
      return res.status(400).json({ error: 'Missing required fields: photo or order_id' })
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(photo.split(',')[1], 'base64')
    const path = `uploads/${order_id}/${Date.now()}_${fileName || 'photo.jpg'}`

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('customer-photos')
      .upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      })

    if (storageError) {
      console.error('Supabase Storage Error:', storageError)
      throw storageError
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('customer-photos')
      .getPublicUrl(path)

    // 3. Store record in database
    const { data: dbData, error: dbError } = await supabase
      .from('customer_uploads')
      .insert([
        {
          order_id,
          url: publicUrl,
          session_id: sessionId,
          metadata: {
            ...metadata,
            fileName,
            upload_path: path,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
          }
        }
      ])
      .select()

    if (dbError) {
      console.error('Supabase DB Error:', dbError)
      throw dbError
    }

    res.status(200).json({
      success: true,
      data: dbData[0]
    })

  } catch (error) {
    console.error('Error in upload endpoint:', error)
    res.status(500).json({
      error: error.message || 'Failed to upload photo',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}
