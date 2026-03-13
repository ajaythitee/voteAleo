import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  return NextResponse.json({
    hasGroqKey: !!groqApiKey,
    hasGeminiKey: !!geminiApiKey,
    message:
      groqApiKey || geminiApiKey
        ? 'API keys are configured'
        : 'No API keys found. Add GROQ_API_KEY and/or GEMINI_API_KEY in Vercel Project Settings > Environment Variables (or .env.local for local dev).',
  });
}
