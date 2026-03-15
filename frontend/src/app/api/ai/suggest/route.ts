import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

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

const suggestResultSchema = z.object({
  title: z.string().trim().default(''),
  description: z.string().trim().default(''),
  options: z.array(z.string().trim()).optional(),
});

const contextConfig = {
  campaign: {
    system:
      'You are improving content for a privacy-preserving voting campaign on VeilProtocol (Aleo blockchain). Keep the exact real-world topic unchanged.',
    optionGuidance: [
      'Suggest 2-4 mutually exclusive voting options.',
      'Keep each option clear, concise, and directly tied to the provided campaign topic.',
      'Do not introduce a new topic or generic filler options.',
    ],
  },
  auction: {
    system:
      'You are improving content for a sealed-bid auction on VeilProtocol (Aleo blockchain). Keep the exact item, collection, or theme unchanged.',
    optionGuidance: [],
  },
} as const;

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

async function generateWithGemini(prompt: string, geminiApiKey: string, suggestOptions: boolean): Promise<SuggestResult | null> {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: suggestOptions ? 0.3 : 0.4,
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

    const validated = suggestResultSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('Gemini: invalid response shape', validated.error.flatten());
      return null;
    }

    const titleStr = validated.data.title;
    const descStr = validated.data.description;
    
    const resultObj: SuggestResult = {
      title: cleanText(titleStr),
      description: cleanText(descStr),
    };
    
    if (suggestOptions && Array.isArray(validated.data.options)) {
      const validOptions = validated.data.options
        .filter((opt: unknown) => typeof opt === 'string' && opt.trim())
        .map((opt: string) => cleanText(opt.trim()))
        .filter((opt: string) => opt.length > 0); // Remove any empty after cleaning
      
      if (validOptions.length >= 2) {
        resultObj.options = validOptions.slice(0, 4); // Contract supports max 4 options
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

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error('AI suggest: No GEMINI_API_KEY configured');
      return NextResponse.json(
        {
          error:
            'AI is not configured. Add GEMINI_API_KEY (and optionally GEMINI_MODEL) in your environment (.env.local for local dev).',
        },
        { status: 500 },
      );
    }

    console.log('AI suggest: Using Gemini for', context, suggestOptions ? 'with options' : '');

    const config = contextConfig[context];
    let prompt = `${config.system}

Current title: "${title}"
Current description: "${description}"`;

    if (context === 'campaign' && suggestOptions) {
      prompt += `

${config.optionGuidance.join('\n')}

Hard rule: the on-chain voting contract supports at most 4 options.

Do NOT change the core topic of the campaign. The improved title and description must clearly match the same subject as the current title and description.

Return JSON with:
{
  "title": "improved title (plain text, no markdown) that keeps the same topic",
  "description": "improved description (plain text, no markdown) that keeps the same topic",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}`;
    } else {
      prompt += `

Return JSON with:
{
  "title": "short, punchy, human-friendly title (plain text, no markdown) that keeps the same topic",
  "description": "2-4 sentence description, clear and professional (plain text, no markdown) that keeps the same topic"
}`;
    }

    const result: SuggestResult | null = await generateWithGemini(prompt, geminiApiKey, suggestOptions);

    // Validate result based on what was requested
    if (!result) {
      console.error('AI suggest: No result returned');
      return NextResponse.json(
        {
          error:
            'AI could not generate a suggestion. Check that GEMINI_API_KEY is set in Vercel Environment Variables, and try again.',
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
