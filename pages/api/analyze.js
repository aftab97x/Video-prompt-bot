import Groq from 'groq-sdk'
import { supabase } from '../../lib/supabase'

async function analyzeWithGroq(base64Video, type) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prompt = type === 'prompt'
    ? `Analyze this video and create video prompts for 5 platforms. Respond ONLY in JSON:
{"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`
    : `Analyze this video and write scripts for 5 platforms. Respond ONLY in JSON:
{"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:video/mp4;base64,${base64Video}` } },
        { type: 'text', text: prompt }
      ]
    }],
    max_tokens: 2000,
    temperature: 0.7,
  })
  const text = response.choices[0].message.content
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}

async function analyzeWithCohere(description, type) {
  const prompt = type === 'prompt'
    ? `Video: "${description}". Create platform prompts. JSON only: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`
    : `Video: "${description}". Write platform scripts. JSON only: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`

  const res = await fetch('https://api.cohere.com/v1/generate', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.COHERE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'command-r-plus', prompt, max_tokens: 1500, temperature: 0.7 })
  })
  const data = await res.json()
  return JSON.parse(data.generations[0].text.replace(/```json\n?|\n?```/g, '').trim())
}

async function analyzeWithOpenRouter(description, type) {
  const prompt = type === 'prompt'
    ? `Video: "${description}". Platform prompts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`
    : `Video: "${description}". Platform scripts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek/deepseek-r1:free', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 })
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim())
}

async function analyzeWithSambanova(description, type) {
  const prompt = type === 'prompt'
    ? `Video: "${description}". Platform prompts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`
    : `Video: "${description}". Platform scripts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`

  const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'Meta-Llama-3.3-70B-Instruct', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 })
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim())
}

async function analyzeWithCerebras(description, type) {
  const prompt = type === 'prompt'
    ? `Video: "${description}". Platform prompts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`
    : `Video: "${description}". Platform scripts JSON: {"YouTube":"...","Facebook":"...","TikTok":"...","Instagram":"...","X (Twitter)":"..."}`

  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.1-70b', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 })
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { videoBase64, type, fileName } = req.body
  if (!videoBase64 || !type) return res.status(400).json({ error: 'Missing fields' })

  const startTime = Date.now()

  try {
    let groqResult, videoDescription = ''
    try {
      groqResult = await analyzeWithGroq(videoBase64, type)
      videoDescription = Object.values(groqResult).join(' ').substring(0, 500)
    } catch (e) {
      groqResult = { error: e.message }
      videoDescription = 'A video with dynamic content and engaging visuals.'
    }

    const [cohereResult, openrResult, sambaResult, cerebrasResult] = await Promise.allSettled([
      analyzeWithCohere(videoDescription, type),
      analyzeWithOpenRouter(videoDescription, type),
      analyzeWithSambanova(videoDescription, type),
      analyzeWithCerebras(videoDescription, type),
    ])

    const results = {
      groq: groqResult,
      cohere: cohereResult.status === 'fulfilled' ? cohereResult.value : { error: cohereResult.reason?.message },
      openr: openrResult.status === 'fulfilled' ? openrResult.value : { error: openrResult.reason?.message },
      samba: sambaResult.status === 'fulfilled' ? sambaResult.value : { error: sambaResult.reason?.message },
      cerebras: cerebrasResult.status === 'fulfilled' ? cerebrasResult.value : { error: cerebrasResult.reason?.message },
    }

    const duration = Date.now() - startTime

    try {
      await supabase.from('analyses').insert({
        file_name: fileName || 'unknown',
        type,
        duration_ms: duration,
        groq_success: !results.groq.error,
        cohere_success: !results.cohere.error,
        openr_success: !results.openr.error,
        samba_success: !results.samba.error,
        cerebras_success: !results.cerebras.error,
        created_at: new Date().toISOString(),
      })
    } catch (dbErr) {
      console.error('Supabase error:', dbErr)
    }

    return res.status(200).json({ results, duration })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '100mb' } }
        }
