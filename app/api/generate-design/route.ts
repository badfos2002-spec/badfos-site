import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      )
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured.')
      return NextResponse.json(
        { error: 'AI Design generation is not configured. Please add OpenAI API key.' },
        { status: 503 }
      )
    }

    // Enhance the prompt for DTF printing
    const enhancedPrompt = `Create a high-quality DTF (Direct-to-Film) print design for a t-shirt: ${prompt}.
    Requirements:
    - High resolution and sharp details
    - Transparent background (PNG format)
    - Bold colors that work well on fabric
    - Clear, crisp lines suitable for printing
    - Professional graphic design style
    - No text unless specifically requested
    - Centered composition suitable for t-shirt placement`

    console.log('🎨 Generating design with DALL-E...')
    console.log('User prompt:', prompt)
    console.log('Enhanced prompt:', enhancedPrompt)

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    console.log('✅ Design generated successfully')

    return NextResponse.json(
      {
        success: true,
        imageUrl,
        revisedPrompt: response.data?.[0]?.revised_prompt,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ Error generating design:', error)

    // Handle specific OpenAI errors
    if (error?.response?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      )
    }

    if (error?.response?.status === 400) {
      return NextResponse.json(
        {
          error:
            'Invalid prompt. Please try a different description that follows content policy.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate design',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
