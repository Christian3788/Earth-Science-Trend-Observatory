// HTTP adapter for AI trend insights.
//
// Builder C (AI insights + API). WS1 owns server.ts, so this file only
// EXPORTS a router — one line mounts it, no server.ts edits needed here:
//
//   import insightsRouter from './src/insights/insightsRouter.ts';
//   app.use('/api/insights', insightsRouter);
//
// POST /api/insights            JSON body = InsightRequestInput (see trendInsights.ts)
// POST /api/insights?polish=gemini   same, plus optional Gemini rewrite when
//                               GEMINI_API_KEY is configured (falls back silently)

import { Router } from 'express';
import type { Request, Response } from 'express';
import { polishInsightsWithGemini } from './geminiPolish.ts';
import {
  generateTrendInsights,
  INSIGHT_EXAMPLE_PAYLOAD,
  validateInsightInput,
} from './trendInsights.ts';

function wantsPolish(req: Request): boolean {
  if (req.query.polish === 'gemini') return true;
  const body = req.body as Record<string, unknown> | undefined;
  return !!body && body.polish === 'gemini';
}

export async function handleInsightsRequest(req: Request, res: Response): Promise<void> {
  const validation = validateInsightInput(req.body);
  if (!validation.ok) {
    res.status(400).json({
      error: 'Invalid trend payload.',
      details: validation.errors,
      example: INSIGHT_EXAMPLE_PAYLOAD,
    });
    return;
  }

  const input = validation.value;
  const insights = generateTrendInsights(input);

  if (wantsPolish(req)) {
    const polished = await polishInsightsWithGemini(insights, {
      variableName: input.variableName,
      regionName: input.regionName,
      unit: input.unit,
    });
    if (polished) {
      res.json({
        insights: { ...insights, headline: polished.headline, bullets: polished.bullets },
        meta: {
          verdict: insights.verdict,
          generatedBy: 'rule-based-v1',
          polishedBy: 'gemini-2.0-flash',
          variableId: input.variableId,
          regionName: input.regionName,
          span: `${input.startYear}-${input.endYear}`,
        },
      });
      return;
    }
  }

  res.json({
    insights,
    meta: {
      verdict: insights.verdict,
      generatedBy: 'rule-based-v1',
      polishedBy: null,
      variableId: input.variableId,
      regionName: input.regionName,
      span: `${input.startYear}-${input.endYear}`,
    },
  });
}

const insightsRouter = Router();
insightsRouter.post('/', handleInsightsRequest);

export default insightsRouter;
