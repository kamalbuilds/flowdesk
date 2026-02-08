import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json()

    const apiKey = process.env.OPENROUTER_API_KEY

    // If no API key or placeholder, return a signal to use local parser
    if (!apiKey || apiKey === 'sk-placeholder') {
      return NextResponse.json({ useLocal: true })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://flowdesk.app',
        'X-Title': 'FlowDesk AI Trading Copilot',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OpenRouter] API error:', response.status, errorText)
      return NextResponse.json({ useLocal: true })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content })
  } catch (err) {
    console.error('[OpenRouter] Error:', err)
    return NextResponse.json({ useLocal: true })
  }
}
