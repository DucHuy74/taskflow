import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Clock3, GitMerge, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastMessage } from '@/components/ui/toast';
import { recommendationService } from '@/services/recommendationService';
import type {
  DuplicateRecommendation,
  RecommendationConfidence,
  RecommendationDecision,
  RecommendationListResponse,
} from '@/types/recommendation';

const confidenceCopy: Record<RecommendationConfidence, string> = {
  HIGH: 'High confidence',
  MEDIUM: 'Needs review',
};

export function RecommendationReviewPage() {
  const { workspaceId: workspaceIdParam } = useParams<{ workspaceId: string }>();
  const workspaceId = workspaceIdParam || '';
  const [confidence, setConfidence] = useState<RecommendationConfidence | undefined>();
  const queryClient = useQueryClient();
  const toast = useToastMessage();

  const recommendations = useInfiniteQuery({
    queryKey: ['recommendations', workspaceId, confidence],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => recommendationService.list(workspaceId, {
      status: 'OPEN', confidence, cursor: pageParam, limit: 20,
    }),
    getNextPageParam: (lastPage) => lastPage.page.nextCursor || undefined,
    enabled: Boolean(workspaceId),
  });

  const job = useQuery({
    queryKey: ['recommendation-job', workspaceId],
    queryFn: () => recommendationService.latestJob(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'QUEUED' || status === 'RUNNING' ? 4000 : false;
    },
  });

  const access = useQuery({
    queryKey: ['workspace-access', workspaceId],
    queryFn: () => recommendationService.access(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const decide = useMutation({
    mutationFn: ({ recommendation, decision }: { recommendation: DuplicateRecommendation; decision: RecommendationDecision }) =>
      recommendationService.decide(workspaceId, recommendation, decision),
    onSuccess: (updated) => {
      queryClient.setQueriesData<InfiniteData<RecommendationListResponse>>(
        { queryKey: ['recommendations', workspaceId] },
        (current) => current ? ({
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((item) => item.id === updated.id ? updated : item),
            summary: {
              ...page.summary,
              open: Math.max(0, page.summary.open - 1),
              high: Math.max(0, page.summary.high - (updated.confidence.band === 'HIGH' ? 1 : 0)),
              medium: Math.max(0, page.summary.medium - (updated.confidence.band === 'MEDIUM' ? 1 : 0)),
            },
          })),
        }) : current,
      );
      toast('The decision was recorded. No story was changed automatically.', 'success', 'Review saved');
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['recommendations', workspaceId] });
      }, 1600);
    },
    onError: (error: { response?: { status?: number } }) => {
      if (error.response?.status === 409) {
        toast('This recommendation changed while you were reviewing it. Refreshing the queue.', 'warning', 'Review conflict');
        void queryClient.invalidateQueries({ queryKey: ['recommendations', workspaceId] });
        return;
      }
      toast('The decision could not be saved. Please try again.', 'error', 'Review failed');
    },
  });

  const items = useMemo(
    () => recommendations.data?.pages.flatMap((page) => page.data) || [],
    [recommendations.data],
  );
  const summary = recommendations.data?.pages[0]?.summary;
  const permissions = new Set(access.data?.permissions || []);
  const canReview = permissions.has('RECOMMENDATION_REVIEW');
  const canAccept = permissions.has('RECOMMENDATION_ACCEPT');

  const submit = (recommendation: DuplicateRecommendation, decision: RecommendationDecision) => {
    if (decision === 'MERGE') {
      const confirmed = window.confirm(
        'Record this pair as approved for merge review? This does not modify or archive either story.',
      );
      if (!confirmed) return;
    }
    decide.mutate({ recommendation, decision });
  };

  if (!workspaceIdParam) return <Navigate to="/" replace />;

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/workspace/${workspaceId}/backlog`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to backlog
        </Link>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Recommendation review
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Possible duplicate stories</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Compare the evidence and record a decision. Similarity is a review signal, not an automatic conclusion.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Open reviews</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{summary?.open ?? '—'}</span>
          </div>
        </div>

        {job.data && (job.data.status === 'QUEUED' || job.data.status === 'RUNNING') && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-100" role="status" aria-busy="true">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Refreshing recommendations</p>
                <p className="text-sm">{job.data.stage || 'Queued'} · {job.data.progress}%</p>
              </div>
            </div>
          </div>
        )}

        {job.data?.status === 'FAILED' && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /><p>The latest analysis failed. The last successful recommendations remain available.</p></div>
            <Button variant="outline" onClick={() => void job.refetch()}>Check again</Button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter by confidence">
          {([undefined, 'HIGH', 'MEDIUM'] as const).map((value) => (
            <button
              key={value || 'ALL'}
              type="button"
              onClick={() => setConfidence(value)}
              aria-pressed={confidence === value}
              className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${confidence === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
            >
              {value ? confidenceCopy[value] : 'All open'}
            </button>
          ))}
        </div>

        <section className="mt-5 space-y-4" aria-busy={recommendations.isLoading || recommendations.isFetchingNextPage}>
          {recommendations.isLoading && Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" role="status">
              <Skeleton className="h-5 w-36" /><Skeleton className="mt-4 h-24 w-full" />
              <span className="sr-only">Loading recommendation</span>
            </div>
          ))}

          {recommendations.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/50" role="alert">
              <AlertTriangle className="mx-auto h-7 w-7 text-red-600" aria-hidden="true" />
              <h2 className="mt-2 font-semibold">Recommendations could not be loaded</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Check your connection and try again.</p>
              <Button className="mt-4" onClick={() => void recommendations.refetch()}>Try again</Button>
            </div>
          )}

          {!recommendations.isLoading && !recommendations.isError && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <Check className="mx-auto h-9 w-9 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold">No recommendations need review</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">The queue is clear for this confidence filter.</p>
            </div>
          )}

          {items.map((recommendation) => {
            const pending = decide.isPending && decide.variables?.recommendation.id === recommendation.id;
            const resolved = recommendation.status !== 'OPEN';
            return (
              <article key={recommendation.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant={recommendation.confidence.band === 'HIGH' ? 'warning' : 'secondary'}>
                      {confidenceCopy[recommendation.confidence.band]}
                    </Badge>
                    <h2 className="mt-2 font-semibold">{recommendation.title}</h2>
                  </div>
                  {resolved && <Badge variant="success">Decision saved</Badge>}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {recommendation.stories.map((story) => (
                    <div key={story.id} className={`min-w-0 rounded-lg border p-4 ${story.id === recommendation.suggestedAction.representativeStoryId ? 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/40' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">{story.id}</span>
                        {story.id === recommendation.suggestedAction.representativeStoryId && <Badge variant="outline">Suggested representative</Badge>}
                      </div>
                      <p className="mt-3 [overflow-wrap:anywhere] text-sm leading-6">{story.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why it was suggested</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {recommendation.evidence.slice(0, 3).map((evidence) => (
                      <li key={evidence.code}><Badge variant="outline">{evidence.label}</Badge></li>
                    ))}
                  </ul>
                  {!recommendation.confidence.calibrated && (
                    <p className="mt-2 text-xs text-slate-500">Confidence is a similarity band, not a probability.</p>
                  )}
                </div>

                {!resolved && (
                  <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end">
                    {canReview && <Button variant="ghost" disabled={pending} onClick={() => submit(recommendation, 'DEFER')}><Clock3 className="h-4 w-4" aria-hidden="true" />Review later</Button>}
                    {canReview && <Button variant="outline" disabled={pending} onClick={() => submit(recommendation, 'KEEP_SEPARATE')}>Keep separate</Button>}
                    {canAccept && <Button isLoading={pending && decide.variables?.decision === 'MERGE'} disabled={pending} onClick={() => submit(recommendation, 'MERGE')}><GitMerge className="h-4 w-4" aria-hidden="true" />Approve merge review</Button>}
                    {!canReview && !canAccept && <p className="text-sm text-slate-500">You have view-only access.</p>}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {recommendations.hasNextPage && (
          <div className="mt-6 text-center">
            <Button variant="outline" isLoading={recommendations.isFetchingNextPage} onClick={() => void recommendations.fetchNextPage()}>Load more</Button>
          </div>
        )}
      </div>
    </main>
  );
}
