// Optional Gemini polish for rule-based trend insights.
//
// Builder C (AI insights + API). Uses the already-installed @google/genai SDK
// only when GEMINI_API_KEY is set; every failure mode (missing key, network
// error, timeout, unexpected shape) resolves to null so the caller falls back
// to the deterministic rule-based text. Never throws.

import type { TrendInsights } from './trendInsights.ts';

const POLISH_MODEL = 'gemini-2.0-flash';
const POLISH_TIMEOUT_MS = 8000;
const MAX_POLISH_CHARS = 4000;

export interface PolishContext {
  variableName: string;
  regionName: string;
  unit: string;
}

function clampText(s: string): string {
  return s.length > MAX_POLISH_CHARS ? `${s.slice(0, MAX_POLISH_CHARS)}…` : s;
}

function isPolishResult(v: unknown): v is { headline: string; bullets: string[] } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.headline === 'string' &&
    r.headline.length > 0 &&
    Array.isArray(r.bullets) &&
    r.bullets.length > 0 &&
    r.bullets.every((b) => typeof b === 'string' && b.length > 0)
  );
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export async function polishInsightsWithGemini(
  insights: TrendInsights,
  context: PolishContext,
): Promise<{ headline: string; bullets: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const prompt =
      `You are a science communicator for ${context.variableName} (${context.unit}) in ${context.regionName}. ` +
      'Rewrite the headline and bullets below in vivid, plain language a 12-year-old can follow. ' +
      'RULES: keep every number, unit, year, p-value, and verdict meaning EXACTLY as written; ' +
      'do not add facts, causes, or predictions; keep the same bullet count. ' +
      'Reply with JSON only: {"headline": "...", "bullets": ["...", ...]}.\n\n' +
      clampText(`HEADLINE: ${insights.headline}\n${insights.bullets.map((b, i) => `BULLET ${i + 1}: ${b}`).join('\n')}`);

    const request = ai.models.generateContent({ model: POLISH_MODEL, contents: prompt });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), POLISH_TIMEOUT_MS));
    const response = (await Promise.race([request, timeout])) as { text?: string } | null;
    if (response === null) return null;

    const text = typeof response.text === 'string' ? response.text : '';
    if (!text) return null;
    const parsed = extractJson(text);
    if (!isPolishResult(parsed)) return null;
    if (parsed.bullets.length !== insights.bullets.length) return null;
    return { headline: parsed.headline.slice(0, 500), bullets: parsed.bullets.map((b) => b.slice(0, 1200)) };
  } catch {
    return null;
  }
}
