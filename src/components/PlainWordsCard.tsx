import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BookOpenText, CircleAlert, CircleCheck, CircleMinus } from 'lucide-react';
import type { TrendAnalysisSummary } from '../utils/statistics';
import type { InsightSourceType, TrendInsights } from '../insights/trendInsights';
import { buildInsightRequest } from '../insights/buildInsightRequest';

interface PlainWordsCardProps {
  summary: TrendAnalysisSummary;
  variableId: string;
  variableName: string;
  unit: string;
  regionName: string;
  startYear: number;
  endYear: number;
  deseasonalized: boolean;
  sourceType: InsightSourceType;
}

interface InsightsApiResponse {
  insights: TrendInsights;
}

const VERDICT_STYLE: Record<TrendInsights['verdict'], { label: string; className: string; Icon: typeof CircleCheck }> = {
  'strong-evidence': {
    label: 'Strong evidence',
    className: 'bg-emerald-700 text-white border-emerald-700',
    Icon: CircleCheck,
  },
  suggestive: {
    label: 'Suggestive, not conclusive',
    className: 'bg-amber-500 text-white border-amber-500',
    Icon: CircleAlert,
  },
  'no-evidence': {
    label: 'No clear trend',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
    Icon: CircleMinus,
  },
  conflicting: {
    label: 'Tests disagree',
    className: 'bg-rose-700 text-white border-rose-700',
    Icon: ArrowLeftRight,
  },
};

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading plain-words finding" className="animate-pulse space-y-3">
      <div className="h-5 w-3/4 rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-slate-100" />
        <div className="h-3.5 w-11/12 rounded bg-slate-100" />
        <div className="h-3.5 w-4/6 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * "In plain words" finding card: calls POST /api/insights with the current
 * trend summary and renders the verdict, headline, bullets, and caveats.
 * Falls back to the locally computed scientific summary if the endpoint is
 * unreachable, so the card never blocks the reading flow.
 */
export const PlainWordsCard: React.FC<PlainWordsCardProps> = ({
  summary,
  variableId,
  variableName,
  unit,
  regionName,
  startYear,
  endYear,
  deseasonalized,
  sourceType,
}) => {
  const payload = useMemo(
    () =>
      buildInsightRequest(summary, {
        variableId,
        variableName,
        unit,
        regionName,
        startYear,
        endYear,
        deseasonalized,
        sourceType,
      }),
    [summary, variableId, variableName, unit, regionName, startYear, endYear, deseasonalized, sourceType],
  );
  const payloadKey = payload ? JSON.stringify(payload) : null;

  const [insights, setInsights] = useState<TrendInsights | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!payloadKey) {
      setInsights(null);
      setFailed(true);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadKey,
      signal: controller.signal,
    })
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`Insights request failed with status ${resp.status}`);
        const data = (await resp.json()) as InsightsApiResponse;
        if (!data?.insights?.headline) throw new Error('Insights response missing headline');
        setInsights(data.insights);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [payloadKey]);

  if (!loading && (failed || !insights)) {
    return (
      <section
        aria-label="Finding in plain words"
        className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-2"
      >
        <div className="flex items-center gap-2">
          <BookOpenText className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-950">In plain words</h3>
        </div>
        <p className="text-sm font-semibold text-slate-900">{summary.verdictTitle}</p>
        <p className="text-sm text-slate-700 leading-relaxed">{summary.scientificSummary}</p>
      </section>
    );
  }

  const verdict = VERDICT_STYLE[insights?.verdict ?? 'no-evidence'];
  const VerdictIcon = verdict.Icon;

  return (
    <section
      aria-label="Finding in plain words"
      className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpenText className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-950">In plain words</h3>
        </div>
        {!loading && insights && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md border whitespace-nowrap ${verdict.className}`}
          >
            <VerdictIcon className="w-3.5 h-3.5" />
            <span>{verdict.label}</span>
          </span>
        )}
      </div>

      {loading || !insights ? (
        <LoadingSkeleton />
      ) : (
        <>
          <p className="text-base font-bold text-slate-950 leading-snug">{insights.headline}</p>
          <ul className="space-y-1.5">
            {insights.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-800 leading-relaxed">
                <span aria-hidden="true" className="text-slate-400 select-none">
                  •
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {insights.caveats.length > 0 && (
            <div className="pt-2 mt-1 border-t border-slate-100 space-y-1">
              <div className="text-xs font-bold text-slate-700">Worth knowing</div>
              {insights.caveats.map((caveat, i) => (
                <p key={i} className="text-xs text-slate-600 leading-relaxed">
                  {caveat}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};
