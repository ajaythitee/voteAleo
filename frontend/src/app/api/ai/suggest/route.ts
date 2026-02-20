import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

type SuggestContext = 'campaign' | 'auction';

interface SuggestBody {
  context: SuggestContext;
  title?: string;
  description?: string;
  suggestOptions?: boolean; // For campaigns: suggest voting options
}

export const dynamic = 'force-dynamic';

interface SuggestResult {
  title: string;
  description: string;
  options?: string[]; // For campaigns: suggested voting options (2-4)
}

// Remove markdown formatting from text
function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
    .replace(/`(.*?)`/g, '$1') // Remove code `text`
    .replace(/#{1,6}\s+/g, '') // Remove headers # ## ###
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url) -> text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .trim();
}

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  retries = 1
): Promise<Response> {
  let res = await fetch(url, opts);
  if (retries > 0 && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await fetch(url, opts);
  }
  return res;
}

async function generateWithGroq(prompt: string, groqApiKey: string, suggestOptions: boolean): Promise<SuggestResult | null> {
  try {
    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: suggestOptions
              ? 'You are an expert product copywriter and campaign strategist. Return ONLY valid JSON. All text must be plain, human-friendly language without markdown formatting (no **, no #, no code blocks).'
              : 'You are an expert product copywriter. Return ONLY valid JSON. All text must be plain, human-friendly language without markdown formatting (no **, no #, no code blocks).',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: suggestOptions ? 500 : 400,
        response_format: { type: 'json_object' },
      }),
    }, 1);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Groq API error:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Groq: No content in response');
      return null;
    }

    let parsed;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (parseErr) {
      console.error('Groq: JSON parse error:', parseErr);
      return null;
    }

    const titleStr = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '';
    const descStr = typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : '';
    
    const result: SuggestResult = {
      title: cleanText(titleStr),
      description: cleanText(descStr),
    };
    
    if (suggestOptions && Array.isArray(parsed.options)) {
      const validOptions = parsed.options
        .filter((opt: unknown) => typeof opt === 'string' && opt.trim())
        .map((opt: string) => cleanText(opt.trim()))
        .filter((opt: string) => opt.length > 0); // Remove any empty after cleaning
      
      if (validOptions.length >= 2) {
        result.options = validOptions.slice(0, 4); // Max 4 options
      }
    }
    
    // If we have options, that's valid even if title/description are empty
    if (result.options && result.options.length >= 2) {
      return result;
    }
    
    // Otherwise, we need at least title or description
    if (!result.title && !result.description) {
      return null;
    }
    
    return result;
  } catch (err) {
    console.error('Groq generation error:', err);
    return null;
  }
}

async function generateWithGemini(prompt: string, geminiApiKey: string, suggestOptions: boolean): Promise<SuggestResult | null> {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (!text) {
      console.error('Gemini: Empty response');
      return null;
    }

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Gemini: JSON parse error:', parseErr, 'Text:', text.slice(0, 200));
      return null;
    }

    const titleStr = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '';
    const descStr = typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : '';
    
    const resultObj: SuggestResult = {
      title: cleanText(titleStr),
      description: cleanText(descStr),
    };
    
    if (suggestOptions && Array.isArray(parsed.options)) {
      const validOptions = parsed.options
        .filter((opt: unknown) => typeof opt === 'string' && opt.trim())
        .map((opt: string) => cleanText(opt.trim()))
        .filter((opt: string) => opt.length > 0); // Remove any empty after cleaning
      
      if (validOptions.length >= 2) {
        resultObj.options = validOptions.slice(0, 4); // Max 4 options
      }
    }
    
    // If we have options, that's valid even if title/description are empty
    if (resultObj.options && resultObj.options.length >= 2) {
      return resultObj;
    }
    
    // Otherwise, we need at least title or description
    if (!resultObj.title && !resultObj.description) {
      return null;
    }
    
    return resultObj;
  } catch (err) {
    console.error('Gemini generation error:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestBody;
    const { context, title = '', description = '', suggestOptions = false } = body;

    if (!context || (!title.trim() && !description.trim())) {
      return NextResponse.json(
        { error: 'Missing context or text to improve' },
        { status: 400 },
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!groqApiKey && !geminiApiKey) {
      console.error('AI suggest: No API keys configured');
      return NextResponse.json(
        {
          error:
            'AI is not configured. Add GROQ_API_KEY and/or GEMINI_API_KEY in Vercel Project Settings > Environment Variables (or in .env.local for local dev).',
        },
        { status: 500 },
      );
    }

    console.log('AI suggest: Using', groqApiKey ? 'Groq' : 'Gemini', 'for', context, suggestOptions ? 'with options' : '');

    const isCampaign = context === 'campaign';
    const baseContext = isCampaign
      ? 'You are improving the title and description for a privacy-preserving voting campaign on VeilProtocol (Aleo blockchain).'
      : 'You are improving the title and description for a sealed-bid auction on VeilProtocol (Aleo blockchain).';

    let prompt = `${baseContext}

Current title: "${title}"
Current description: "${description}"`;

    if (isCampaign && suggestOptions) {
      prompt += `

Based on the campaign title and description, suggest 2-4 voting options that voters can choose from.
Options should be:
- Clear and concise (2-5 words each)
- Mutually exclusive choices
- Relevant to the campaign topic
- Human-friendly language (no markdown, no formatting)

Return JSON with:
{
  "title": "improved title (plain text, no markdown)",
  "description": "improved description (plain text, no markdown)",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}`;
    } else {
      prompt += `

Return JSON with:
{
  "title": "short, punchy, human-friendly title (plain text, no markdown)",
  "description": "2-4 sentence description, clear and professional (plain text, no markdown)"
}`;
    }

    let result: SuggestResult | null = null;

    if (groqApiKey) {
      result = await generateWithGroq(prompt, groqApiKey, suggestOptions);
    }
    if (!result && geminiApiKey) {
      result = await generateWithGemini(prompt, geminiApiKey, suggestOptions);
    }

    // Validate result based on what was requested
    if (!result) {
      console.error('AI suggest: No result returned');
      return NextResponse.json(
        {
          error:
            'AI could not generate a suggestion. Check that GROQ_API_KEY and/or GEMINI_API_KEY are set in Vercel Environment Variables, and try again.',
        },
        { status: 500 },
      );
    }

    // If suggesting options, we need at least options OR title/description
    if (suggestOptions && !result.options?.length && !result.title && !result.description) {
      console.error('AI suggest: No options or text returned', result);
      return NextResponse.json(
        { error: 'AI could not generate options. Please try again.' },
        { status: 500 },
      );
    }

    // If not suggesting options, we need at least title or description
    if (!suggestOptions && !result.title && !result.description) {
      console.error('AI suggest: No title or description returned', result);
      return NextResponse.json(
        {
          error:
            'AI returned an unexpected format. Check your API keys in Vercel Environment Variables and try again.',
        },
        { status: 500 },
      );
    }

    console.log('AI suggest: Success', { hasTitle: !!result.title, hasDescription: !!result.description, optionsCount: result.options?.length || 0 });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('AI suggest error:', err);
    return NextResponse.json(
      {
        error: 'Failed to generate suggestion',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
