import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Serve FAQs to the Questions page, reading from public/kb/faqs.json
export const revalidate = 0; // disable caching
export const dynamic = 'force-dynamic';

interface RawItem {
  id?: number | string;
  question?: string;
  answer?: string;
  category?: string;
  tags?: string | string[];
  [key: string]: unknown;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string; // comma-separated
}

export async function GET(req: Request) {
  try {
    const kbPath = path.join(process.cwd(), 'public', 'kb', 'faqs.json');

    if (!existsSync(kbPath)) {
      // Gracefully return empty list if file does not exist yet
      return NextResponse.json({ faqs: [] });
    }

    const file = await readFile(kbPath, 'utf8');

    let json: unknown;
    try {
      json = JSON.parse(file);
    } catch (e) {
      console.error('Invalid JSON in public/kb/faqs.json');
      return NextResponse.json({ faqs: [] });
    }

    // Accept either an array or an object with { faqs: [...] }
    const items: RawItem[] = Array.isArray(json)
      ? (json as RawItem[])
      : (json as any)?.faqs ?? [];

    const faqs: FAQ[] = items
      .filter((it) => typeof it === 'object' && it !== null)
      .map((it, idx) => {
        const idNum = Number(it.id ?? idx + 1);
        const question = String(it.question ?? '').trim();
        const answer = String(it.answer ?? '').trim();
        const rawCategory = String(it.category ?? '').trim();
        const category = rawCategory.toLowerCase() === 'faq' ? 'FAQ' : 'Questions';
        const tags = Array.isArray(it.tags)
          ? it.tags.join(',')
          : String(it.tags ?? '').trim();

        return {
          id: Number.isFinite(idNum) ? idNum : idx + 1,
          question,
          answer,
          category,
          tags,
        } as FAQ;
      })
      // keep only valid entries that have at least a question and answer
      .filter((f) => f.question && f.answer);

    const { searchParams } = new URL(req.url);
    const catParam = (searchParams.get('category') || '').toLowerCase();
    const categoryFilter = catParam === 'faq' ? 'FAQ' : catParam === 'questions' ? 'Questions' : undefined;
    const filtered = categoryFilter ? faqs.filter((f) => f.category === categoryFilter) : faqs;

    return NextResponse.json({ faqs: filtered });
  } catch (error) {
    console.error('Error in /api/faqs:', error);
    return NextResponse.json({ faqs: [] });
  }
}

export const runtime = 'nodejs';
