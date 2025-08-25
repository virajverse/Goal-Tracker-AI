import OpenAI from 'openai';
import { generateText } from '@/lib/gemini';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export type AIProvider = 'openai' | 'gemini' | 'auto' | 'none';

function getEnv(key: string): string | undefined {
  const v = process.env[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function resolveProvider(): Exclude<AIProvider, 'auto'> {
  const configured = (getEnv('AI_PROVIDER') as AIProvider | undefined)?.toLowerCase() as AIProvider | undefined;
  const openaiKey = getEnv('A4F_API_KEY') || getEnv('OPENAI_API_KEY');
  const geminiKey = getEnv('GOOGLE_AI_API_KEY');

  if (configured === 'openai' && openaiKey) return 'openai';
  if (configured === 'gemini' && geminiKey) return 'gemini';

  // Auto
  if (openaiKey) return 'openai';
  if (geminiKey) return 'gemini';
  return 'none';
}

async function isBlockedByPolicy(text: string): Promise<boolean> {
  try {
    const policyPath = path.join(process.cwd(), 'public', 'kb', 'policy.json');
    if (!existsSync(policyPath)) return false;
    const raw = await readFile(policyPath, 'utf8');
    const parsed = JSON.parse(raw);
    const disallowed: string[] = Array.isArray(parsed?.disallowed) ? parsed.disallowed : [];
    if (disallowed.length === 0) return false;
    const lower = text.toLowerCase();
    return disallowed.some((term) => typeof term === 'string' && term.trim() && lower.includes(term.toLowerCase()));
  } catch {
    return false;
  }
}

export interface AIRespondOptions {
  userMessage: string;
  styleGuide?: string; // optional extra style instructions
  context?: string; // any contextual info appended to the prompt
  systemPrompt?: string; // for OpenAI
  maxTokens?: number;
  temperature?: number;
  enforcePolicy?: boolean; // default true
}

export async function aiRespond(opts: AIRespondOptions): Promise<string | null> {
  const {
    userMessage,
    styleGuide = [
      'Respond concisely.',
      'Use at most 5 bullet points if listing.',
      "Prefer hyphen '-' bullets.",
      'Avoid long introductions or conclusions.',
    ].join(' '),
    context = '',
    systemPrompt = 'You are a helpful assistant.',
    maxTokens = 250,
    temperature = 0.7,
    enforcePolicy = true,
  } = opts;

  if (!userMessage || typeof userMessage !== 'string') return null;

  const provider = resolveProvider();

  const assembled = [styleGuide, context, `Message: ${userMessage}`]
    .filter(Boolean)
    .join('\n\n');

  if (enforcePolicy) {
    const blocked = await isBlockedByPolicy(userMessage);
    if (blocked) {
      return "This topic isn't supported by our assistant. Please ask about goals, habits, productivity, health, or check the Knowledge Base at /questions.";
    }
  }

  if (provider === 'openai') {
    try {
      const apiKey = getEnv('A4F_API_KEY') || getEnv('OPENAI_API_KEY');
      if (!apiKey) throw new Error('Missing OpenAI API key');
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: assembled },
        ],
        max_tokens: maxTokens,
        temperature,
      });
      return completion.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      // fall through
    }
  }

  if (provider === 'gemini') {
    try {
      const output = await generateText({ prompt: `${styleGuide}\n\n${context}\n\n${userMessage}`, maxOutputTokens: maxTokens, temperature });
      return output?.trim() || null;
    } catch {
      // fall through
    }
  }

  return null;
}
