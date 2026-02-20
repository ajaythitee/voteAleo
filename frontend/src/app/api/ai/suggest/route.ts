import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type SuggestContext = 'campaign' | 'auction';

interface SuggestBody {
  context: SuggestContext;
  title?: string;
  description?: string;
}

export const dynamic = 'force-dynamic';

interface SuggestResult {
  title: string;
  description: string;
}

async function generateWithGroq(prompt: string, groqApiKey: string): Promise<SuggestResult | null> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert product copywriter. Return ONLY valid JSON for improved title and description.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '',
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : '',
    };
  } catch {
    return null;
  }
}

async function generateWithGemini(prompt: string, geminiApiKey: string): Promise<SuggestResult | null> {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const parsed = JSON.parse(jsonText);

    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '',
      description:
        typeof parsed.description === 'string' && parsed.description.trim()
          ? parsed.description.trim()
          : '',
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestBody;
    const { context, title = '', description = '' } = body;

    if (!context || (!title.trim() && !description.trim())) {
      return NextResponse.json(
        { error: 'Missing context or text to improve' },
        { status: 400 },
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!groqApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI is not configured (missing GROQ_API_KEY / GEMINI_API_KEY)' },
        { status: 500 },
      );
    }

    const baseContext =
      context === 'campaign'
        ? 'You are improving the title and description for a privacy-preserving voting campaign on VeilProtocol (Aleo).'
        : 'You are improving the title and description for a sealed-bid auction on VeilProtocol (Aleo).';

    const prompt = `${baseContext}

Current title: "${title}"
Current description: "${description}"

Return JSON with:
{
  "title": "short, punchy, human-friendly title",
  "description": "2-4 sentence description, clear and professional"
}`;

    let result: SuggestResult | null = null;

    if (groqApiKey) {
      result = await generateWithGroq(prompt, groqApiKey);
    }
    if (!result && geminiApiKey) {
      result = await generateWithGemini(prompt, geminiApiKey);
    }

    if (!result || (!result.title && !result.description)) {
      return NextResponse.json(
        { error: 'AI could not generate a suggestion' },
        { status: 500 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('AI suggest error:', err);
    return NextResponse.json(
      {
        error: 'Failed to generate suggestion',
        message: err?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }
}

