import { useCallback, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Layers3, Network, RefreshCw, Search, Table2 } from 'lucide-react';
import { NodeStoriesPanel } from '@/components/graph/NodeStoriesPanel';
import { ForceGraph3D, type ForceGraph3DHandle } from '@/components/graph/ForceGraph3D';
import { Button } from '@/components/ui/button';
import { useToastMessage } from '@/components/ui/toast';
import { adaptGraphData, describeRoles, storyIdsForNode, termIdsForStory, toSvoGraph, type VisualGraphNode } from '@/lib/graph/graphModel';
import { cn } from '@/lib/utils';
import { graphService, type GraphData } from '@/services/graphService';
import { workspaceService } from '@/services/workspaceService';
import { recommendationService } from '@/services/recommendationService';
import { recommendationJobQueryKey } from '@/lib/queryKeys';
import type { RecommendationJob } from '@/types/recommendation';

const EMPTY_GRAPH: GraphData = { nodes: [], edges: [] };
const JOB_POLL_MS = 2000;
const isJobActive = (job?: RecommendationJob | null) => job?.status === 'QUEUED' || job?.status === 'RUNNING';
const formatStage = (stage?: string) => (stage ? stage.charAt(0) + stage.slice(1).toLowerCase() : '');
const metric = (value: number) => value > 0 && value < 0.01 ? '<0.01' : value.toFixed(2);

export function WorkspaceGraphPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const showToast = useToastMessage();
  const queryClient = useQueryClient();
  const canvasRef = useRef<ForceGraph3DHandle>(null);
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VisualGraphNode | null>(null);
  const { data: workspace } = useQuery({ queryKey: ['workspace', workspaceId], queryFn: () => workspaceService.getWorkspace(workspaceId!), enabled: Boolean(workspaceId) });
  const graphQuery = useQuery({ queryKey: ['workspace-graph', workspaceId], queryFn: () => graphService.getBacklogGraph(workspaceId!), enabled: Boolean(workspaceId) });
  // Only the semantic S–V–O layer is drawn; user story nodes would clutter the overview.
  const graph = useMemo(() => toSvoGraph(adaptGraphData(graphQuery.data ?? EMPTY_GRAPH)), [graphQuery.data]);
  const ranked = useMemo(() => [...graph.nodes].sort((a, b) => b.betweenness - a.betweenness || b.degree - a.degree).slice(0, 8), [graph.nodes]);
  const [highlightedStoryId, setHighlightedStoryId] = useState<string | null>(null);
  const selectNode = useCallback((node: VisualGraphNode | null) => { setSelected(node); setHighlightedStoryId(null); }, []);
  const handleNodeSelected = selectNode;
  const selectedStoryIds = useMemo(() => (selected ? storyIdsForNode(graph, selected.id) : []), [graph, selected]);
  const highlightIds = useMemo(() => (highlightedStoryId ? termIdsForStory(graph, highlightedStoryId) : null), [graph, highlightedStoryId]);

  // Job id returned by POST /rebuild-graph; while set, poll the latest recommendation job until it settles.
  const [rebuildJobId, setRebuildJobId] = useState<string | null>(null);
  // Mirror for the query function so a refetch started right after a new rebuild sees the new id.
  const rebuildJobIdRef = useRef<string | null>(null);
  const trackJob = useCallback((jobId: string | null) => {
    rebuildJobIdRef.current = jobId;
    setRebuildJobId(jobId);
  }, []);
  const jobQuery = useQuery({
    queryKey: recommendationJobQueryKey(workspaceId ?? ''),
    queryFn: async () => {
      const job = await recommendationService.latestJob(workspaceId!);
      // Settle once the job we triggered finishes: refresh the graph or report the failure.
      if (job && job.id === rebuildJobIdRef.current && !isJobActive(job)) {
        if (job.status === 'SUCCEEDED') {
          showToast('The workspace graph has been rebuilt.', 'success', 'Graph updated');
          void queryClient.invalidateQueries({ queryKey: ['workspace-graph', workspaceId] });
        } else {
          showToast('The graph rebuild failed. Please try again.', 'error', 'Rebuild failed');
        }
        trackJob(null);
      }
      return job;
    },
    enabled: Boolean(workspaceId && rebuildJobId),
    // Keep polling while our job is queued/running, or until the latest job is the one we triggered.
    // Polling stops automatically when this page unmounts.
    refetchInterval: (query) => {
      if (!rebuildJobId || query.state.status === 'error') return false;
      const job = query.state.data;
      return !job || job.id !== rebuildJobId || isJobActive(job) ? JOB_POLL_MS : false;
    },
  });
  const trackedJob = jobQuery.data && jobQuery.data.id === rebuildJobId ? jobQuery.data : null;

  const rebuildMutation = useMutation({
    mutationFn: async () => {
      const jobId = await workspaceService.rebuildGraph(workspaceId!);
      if (!jobId) throw new Error('Graph rebuild was rejected');
      return jobId;
    },
    onSuccess: (jobId) => {
      showToast('Rebuild queued. The graph will refresh when analysis finishes.', 'success', 'Graph update queued');
      trackJob(jobId);
      // Clear any earlier polling error so progress tracking restarts for the new job.
      void queryClient.invalidateQueries({ queryKey: recommendationJobQueryKey(workspaceId!) });
    },
    onError: () => showToast('Could not request a graph rebuild. Please try again.', 'error', 'Rebuild failed'),
  });
  const isRebuilding = rebuildMutation.isPending || (Boolean(rebuildJobId) && !jobQuery.isError);
  const rebuildStatus = rebuildJobId
    ? jobQuery.isError
      ? 'Rebuild progress unavailable — refresh later'
      : trackedJob
      ? `${trackedJob.status === 'QUEUED' ? 'Queued' : formatStage(trackedJob.stage) || 'Running'} · ${Math.round(trackedJob.progress ?? 0)}%`
      : 'Rebuild queued…'
    : '';

  if (!workspaceId) return <Navigate to="/" replace />;
  return <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1540px]">
    <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><nav className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">Workspaces / {workspace?.name || 'Workspace'}</nav><h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">S–V–O story graph</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Explore analyzed stories as a semantic, force-directed overview.</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-slate-500 dark:text-slate-400" role="status">{graphQuery.dataUpdatedAt ? `Updated ${new Date(graphQuery.dataUpdatedAt).toLocaleTimeString()}` : 'Not loaded yet'}</span><Button variant="outline" onClick={() => void graphQuery.refetch()} disabled={graphQuery.isFetching}><RefreshCw aria-hidden="true" className={cn('h-4 w-4', graphQuery.isFetching && 'animate-spin')} /> Refresh</Button><span role="status" aria-live="polite" className={cn('text-xs font-medium tabular-nums text-indigo-700 dark:text-indigo-300', !rebuildStatus && 'sr-only')}>{rebuildStatus}</span><Button onClick={() => rebuildMutation.mutate()} isLoading={isRebuilding} disabled={isRebuilding}><Network aria-hidden="true" className="h-4 w-4" /> Rebuild graph</Button></div>
    </header>
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5"><NavLink to={`/workspace/${workspaceId}/backlog`} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-slate-600 no-underline hover:border-slate-300 dark:hover:border-slate-700 dark:text-slate-300"><Layers3 aria-hidden="true" className="h-4 w-4" /> Backlog</NavLink><NavLink to={`/workspace/${workspaceId}/graph`} className="flex min-h-11 items-center gap-2 border-b-2 border-indigo-600 text-sm font-semibold text-indigo-700 no-underline dark:text-indigo-300"><GitBranch aria-hidden="true" className="h-4 w-4" /> Story graph</NavLink></div>
      <div className="mb-3 flex w-full gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-72"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><label htmlFor="graph-search" className="sr-only">Search graph terms</label><input id="graph-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find terms and neighbors" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:text-sm" /></div><ViewToggle view={view} setView={setView} /></div>
    </div>
    <GraphSummary nodes={graph.nodes} edges={graph.edges.length} />
    {graphQuery.isLoading ? <Loading /> : !graph.nodes.length ? <Empty onRebuild={() => rebuildMutation.mutate()} loading={isRebuilding} /> : view === 'table' ? <GraphTable nodes={graph.nodes} onSelect={(node) => { setSelected(node); setView('graph'); }} /> : <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div><ForceGraph3D ref={canvasRef} graph={graph} storageKey={`taskflow:graph3d:workspace:${workspaceId}`} selectedNodeId={selected?.id ?? null} searchQuery={search} highlightIds={highlightIds} onNodeSelected={handleNodeSelected} className="h-[min(72vh,820px)]" /><GraphLegend /></div>
      <Insights selected={selected} ranked={ranked} onSelect={selectNode} stories={<NodeStoriesPanel workspaceId={workspaceId} storyIds={selectedStoryIds} highlightedStoryId={highlightedStoryId} onHighlightStory={setHighlightedStoryId} />} storyCount={selectedStoryIds.length} onFocus={() => canvasRef.current?.focusSelected()} onUnpin={() => canvasRef.current?.unpinSelected()} />
    </div>}
  </div></div>;
}

function GraphSummary({ nodes, edges }: { nodes: VisualGraphNode[]; edges: number }) {
  const values: Array<[string, number]> = [['Subjects', nodes.filter((node) => node.type === 'SUBJECT').length], ['Actions', nodes.filter((node) => node.type === 'ACTION').length], ['Objects', nodes.filter((node) => node.type === 'OBJECT').length], ['Mixed-role terms', nodes.filter((node) => node.type === 'TERM').length], ['Relationships', edges]];
  return <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Graph summary">{values.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</p></div>)}</section>;
}

function ViewToggle({ view, setView }: { view: 'graph' | 'table'; setView: (view: 'graph' | 'table') => void }) {
  const button = 'grid h-10 w-10 cursor-pointer place-items-center rounded-md text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300';
  return <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" aria-label="Graph display mode"><button type="button" aria-label="Graph view" aria-pressed={view === 'graph'} onClick={() => setView('graph')} className={cn(button, view === 'graph' && 'bg-indigo-600 text-white dark:text-white')}><GitBranch aria-hidden="true" className="h-4 w-4" /></button><button type="button" aria-label="Table view" aria-pressed={view === 'table'} onClick={() => setView('table')} className={cn(button, view === 'table' && 'bg-indigo-600 text-white dark:text-white')}><Table2 aria-hidden="true" className="h-4 w-4" /></button></div>;
}

function GraphLegend() {
  const nodes: Array<[string, string, string]> = [['Subject · sphere', 'bg-blue-600 dark:bg-blue-400', 'rounded-full'], ['Action · octahedron', 'bg-violet-600 dark:bg-violet-400', 'rotate-45 rounded-[2px]'], ['Object · cube', 'bg-cyan-600 dark:bg-cyan-400', 'rounded-[2px]'], ['Mixed-role term', 'bg-slate-500 dark:bg-slate-400', '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]']];
  return <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label="Graph legend">{nodes.map(([label, color, shape]) => <span key={label} className="flex items-center gap-2"><span className={cn('h-3 w-3 shrink-0', color, shape)} aria-hidden="true" />{label}</span>)}<span className="ml-auto text-slate-500 dark:text-slate-400">Solid: S → V → O flow · dashed: similarity / association · green dot: pinned</span></div>;
}

function Insights({ selected, ranked, onSelect, onFocus, onUnpin, stories, storyCount }: { selected: VisualGraphNode | null; ranked: VisualGraphNode[]; onSelect: (node: VisualGraphNode) => void; onFocus: () => void; onUnpin: () => void; stories: React.ReactNode; storyCount: number }) {
  return <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Graph insights">{selected ? <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Selected · {describeRoles(selected)}</p><h2 className="mt-1 break-words text-lg font-semibold text-slate-950 dark:text-white">{selected.label}</h2><dl className="mt-5 grid grid-cols-2 gap-2"><Metric label="Priority" value={metric(selected.priority)} /><Metric label="Structure" value={metric(selected.structure)} /><Metric label="Degree" value={String(selected.degree)} /><Metric label="Betweenness" value={metric(selected.betweenness)} /></dl><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={onFocus}>Focus neighbors</Button><Button size="sm" variant="outline" onClick={onUnpin}>Unpin if pinned</Button></div><section className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="User stories using this term"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">User stories <span className="font-normal text-slate-500 dark:text-slate-400">({storyCount})</span></h3>{stories}</section></div> : <div><Network aria-hidden="true" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><h2 className="mt-2 font-semibold">Graph insights</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Only subject, action and object terms are shown. Select a node to highlight its one-hop neighborhood; double-click to expand to two hops.</p></div>}<div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700"><h3 className="text-sm font-semibold">Bridge terms</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ranked by betweenness, with a client-side fallback.</p><ol className="mt-3 space-y-1">{ranked.map((node, index) => <li key={node.id}><button type="button" onClick={() => onSelect(node)} className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"><span className="w-5 text-xs tabular-nums text-slate-400 dark:text-slate-500">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium" title={node.label}>{node.label}</span><span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{metric(node.betweenness)}</span></button></li>)}</ol></div></aside>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>; }
function Loading() { return <div className="grid min-h-[560px] place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" role="status"><div className="text-center"><RefreshCw aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 motion-reduce:animate-none" /><p className="mt-3 text-sm">Loading workspace graph…</p></div></div>; }
function Empty({ onRebuild, loading }: { onRebuild: () => void; loading: boolean }) { return <div className="grid min-h-[560px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900"><div><Network aria-hidden="true" className="mx-auto h-10 w-10 text-indigo-600 dark:text-indigo-400" /><h2 className="mt-4 text-lg font-semibold">No graph data yet</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add stories, wait for background analysis, then rebuild the workspace graph.</p><Button className="mt-5" onClick={onRebuild} isLoading={loading}>Rebuild graph</Button></div></div>; }
function GraphTable({ nodes, onSelect }: { nodes: VisualGraphNode[]; onSelect: (node: VisualGraphNode) => void }) { return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">S–V–O graph nodes and metrics</caption><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:text-slate-400 dark:bg-slate-800"><tr><th scope="col" className="px-4 py-3">Term</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3 text-right">Priority</th><th scope="col" className="px-4 py-3 text-right">Structure</th><th scope="col" className="px-4 py-3 text-right">Degree</th><th scope="col" className="px-4 py-3 text-right">Betweenness</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{nodes.map((node) => <tr key={node.id}><td className="px-4 py-3"><button type="button" onClick={() => onSelect(node)} className="cursor-pointer font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">{node.label}</button></td><td className="px-4 py-3">{describeRoles(node)}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.priority)}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.structure)}</td><td className="px-4 py-3 text-right tabular-nums">{node.degree}</td><td className="px-4 py-3 text-right tabular-nums">{metric(node.betweenness)}</td></tr>)}</tbody></table></div>; }
